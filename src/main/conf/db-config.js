
/**
 *  db-config.js
 * 
 *  Contains the MongoDB DAO set-up
 */

module.exports = function () {
  /*
   * TOOLSETS
   */
  var fs = require("fs"),
      mongo = require("mongodb"),
      GridFSStream = require("gridfs-stream"),
      Db = mongo.Db,
      Server = mongo.Server,
      Grid = mongo.Grid,
      GridStore = mongo.GridStore,
      ObjectID = mongo.ObjectID
      daoHost = "localhost",
      daoPort = 27017;
  
  
  /*
   * CONFIGURATION
   */
  var DAO = function (host, port) {
      this.db = new Db('eCause',
        new Server(host, port, { safe: true }, { auto_reconnect: true }, { }),
        { w: 1 } // Has to do with write semantics.
      );

      this.db.open(function (error) {
        if (error) {
          console.error("[X] DATABASE: There were errors in the database configuration...");
          console.error(error);
        } else {
          console.log("[!] DATABASE: db on host and port " + host + ":" + port + " has successfully connected!");
        }
        
      });
    };
    
  /*
   * DAO PROPERTIES
   */
  // Shows what properties are indexed in what collections
  DAO.prototype.indexes = {
  };
  
  // Performs the given DB action ONLY if the indexed collection contains no duplicate
  // Returns the status of uniqueness and the collection for further processing
  DAO.prototype.ensureUnique = function (collection, record, callback) {
    if (typeof(this.indexes[collection]) !== "undefined") {
      var searchParams = this.indexes[collection];
      for (var s in searchParams) {
        searchParams[s] = record[s];
      }
      // Search the collection for any matching documents; if they're found, you're in trouble
      this.db.collection(collection, function (error, currentCollection) {
        currentCollection.find(searchParams).toArray(function (error2, results) {
          if (error2) {
            callback(error, false, currentCollection);
          } else {
            callback(null, !Boolean(results.length), currentCollection);
          }
        });
      });
    
    // If there are no indexes to ensure, then just return true plus the collection, and you're done
    } else {
      this.db.collection(collection, function (error, currentCollection) {
        callback(null, true, currentCollection);
      });
    }
  };


  /*
   * DAO ACCESS POINTS
   */

  // Returns an array of the matching documents in the indicated collection
  DAO.prototype.search = function (col, query, callback) {
    this.db.collection(col, function (error, currentCollection) {
      if (error) {
        callback(error);
      } else {
        currentCollection.find(
          query,
          // Omit password fields in any search
          {
            password: 0
          }
        ).toArray(function (error, results) {
          if (error) {
            callback(error);
          } else {
            callback(null, results);
          }
        });
      }
    });
  };
  
  // Save a document.
  DAO.prototype.save = function (col, recordToInsert, callback) {
    this.ensureUnique(col, recordToInsert, function (error, isUnique, currentCollection) {
      if (error) {
        callback(error);
      } else if (!isUnique) {
        callback(null, {unique: false});
      } else {
        currentCollection.insert(recordToInsert, function () {
          callback(null, recordToInsert);
        });
      }
    });
  };
  
  // Update a document.
  DAO.prototype.update = function (col, query, update, upsert, callback) {
    var trueUpdate = update,
        nonSetFound = false;
    // Make sure that the update is indeed a set
    for (var u in update) {
      if (u[0] === "$") {
        nonSetFound = true;
        break;
      }
    }
    
    if (!nonSetFound) {
      trueUpdate = {
        $set: update
      }
    }
    this.db.collection(col, function (error, currentCollection) {
      if (error) {
        callback(error);
      } else {
        currentCollection.findAndModify(
          // Query
          query,
          // Sort
          [['_id','asc']],
          // Update
          trueUpdate,
          // Options
          {upsert: (upsert) ? upsert : false}, // Adds the object based on the parameter
          // Callback
          function (err, object) {
            if (err) {
              callback(err);
            } else {
              callback(null, object);
            }
          }
        );
      }
    });
  };
  
  // Delete a document.
  DAO.prototype.remove = function (col, query, callback) {
    this.db.collection(col, function (error, currentCollection) {
      if (error) {
        callback(error);
      } else {
        currentCollection.findAndModify(
          // Query
          query,
          // Sort
          [['_id','asc']],
          // Update
          {},
          // Options
          {remove: true}, // Removes the object if it exists
          // Callback
          function (err, object) {
            if (err) {
              callback(err);
            } else {
              callback(null, object);
            }
          }
        );
      }
    });
  };
  
  // Saves a resource to the database at the given collection with the given options
  // Options may include properties:
  //   metadata: any metadata to attach to the saved file
  DAO.prototype.saveFile = function (file, collection, options, callback) {
    var fileId = new ObjectID(),
        currentThis = this,
        gfs = GridFSStream(currentThis.db, mongo),
        
        // Configure the writestream to take from the express temp-file location
        writeStream = gfs.createWriteStream(
          {
            _id: fileId,
            filename: file.name,
            mode: "w",
            chunk_size: 1024,
            content_type: file.type,
            root: collection,
            metadata: (options.metadata) ? options.metadata : {}
          }
        );
        
    // Pipe the temp file from the file system into the gridfs-stream writestream
    fs.createReadStream(file.path).pipe(writeStream);
    
    // This event will be triggered after the file is done writing
    writeStream.on("close", function (writtenFile) {
      callback(null, writtenFile);
    });
  };
  
  // Returns any matching files consistent with the query metadata in the given collection
  DAO.prototype.findFile = function (collection, query, callback) {
    var gfs = GridFSStream(this.db, mongo);
    gfs
      .collection(collection)
      .find(query)
      .toArray(callback);
  };
  
  // Removes the files with the given query
  DAO.prototype.removeFile = function (collection, query, callback) {
    var gfs = GridFSStream(this.db, mongo);
    
    this.findFile(
      collection,
      query,
      function (err, result) {
        if (result.length) {
          gfs.remove(
            {
              root: collection,
              _id: result[0]._id
            },
            callback
          );
        } else {
          callback(null, null);
        }
      }
    );
  };
  
  
  /*
   * TASK-SPECIFIC DAO QUERIES
   */
  
  // Returns the file stream associated with the resource with the given id
  DAO.prototype.getResourceFileStreamById = function (collection, id) {
    var gfs = GridFSStream(this.db, mongo),
        // Configure the readstream
        readStream = gfs.createReadStream(
          {
            _id: id,
            mode: "r",
            chunk_size: 1024,
            root: collection
          }
        );
        
    return readStream;
  };
  
  // Returns any matching files consistent with the query metadata in the given collection
  DAO.prototype.findFile = function (collection, query, callback) {
    var gfs = GridFSStream(this.db, mongo);
    gfs
      .collection(collection)
      .find(query)
      .toArray(callback);
  };
  
  var dao = this.dao = new DAO(daoHost, daoPort);
  
  
  /*
   * DAO POST-CONFIGURATION
   */
  // Create indexes for each collection
  for (var i in dao.indexes) {
    var currentIndexes = dao.indexes[i];
    dao.db.collection(i, function (error, currentCollection) {
      currentCollection.ensureIndex(currentIndexes, {unique: true}, function (err) {
        if (err) {
          console.error("[X] DATABASE: Error with DB index in collection " + i + " and index " + currentIndexes);
        }
      })
    });
  }
  

  return this;
};