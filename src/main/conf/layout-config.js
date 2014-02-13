/**
 * layout-config.js
 *
 * Configures controller rendering options.
 */

module.exports = function (layoutConfig) {
  layoutConfig = this.layoutConfig = {};
  
  layoutConfig.layoutOptions = function (req, options) {
    var rendering = {};
    
    rendering.layout = (options && options.layout) ? options.layout : true;
    rendering.title = (options && options.title) ? options.title : "eCause";
    rendering.css = (options && options.css) ? options.css : "";
    rendering.scripts = (options && options.scripts) ? JSON.stringify(options.scripts) : "";
    rendering.page = (options && options.page) ? options.page : null;
    
    return rendering;
  };
  
  return this;
}
