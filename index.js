var smartclass = require("smartclass");
var fs = require("fs");
var jade = require("jade");
var mkdirp = require("mkdirp");
var path = require("path");
var findit = require("findit");

module.exports = Template = smartclass.extendWith("Template",{
  init : function(config){
    if (config.path === undefined)
      throw "The config for qjade must include a path value";
    
    this.name = config.name;
    this.jadepath = config.path;
    this.staticpath = config.staticpath;
    this.public = config.public === true;
    this.debug = config.debug === true;
  },
  render : function(locals){
    return this.renderStatic(locals);
  },
  renderStatic : function(locals){
    if (this._fn)
      return this._fn(locals);
    else
      return "";
  },
  
  jadepath : {
    get : function(){
      return this._jadepath;
    },
    set : function(v){
      if (this._jadepath !== v){
        // if we're watching the previous file, then unwatch it
        this.watchOff();
        
        this._jadepath = v;
        
        this.recompile();
        
        // if debuging is enabled, then watch the new file
        this.watchOn();
      }
    }
  },
  public : {
    get : function(){
      return this._public;
    },
    set : function(v){
      if (this._public !== v){
        this._public = v;
        
        this.recompile();
      }
    }
  },
  staticpath : {
    get : function(){
      return this._staticpath;
    },
    set : function(v){
      if (this._staticpath !== v){
        this._staticpath = v;
        
        this.recompile();
      }
    }
  },
  debug : {
    get : function(){
      return this._debug;
    },
    set : function(v){
      if (this._debug !== v){
        this._debug = v;
        
        this.recompile();
        
        if (v)
          this.watchOn();
        else
          this.watchOff();
      }
    }
  },
  watchOn : function(){
    if (this._jadepath && this._jadepath.length && this._debug)
      fs.watchFile(this._jadepath,{ persistent:false },this.recompile);
  },
  watchOff : function(){
    if (this._jadepath && this._jadepath.length && this._debug)
      fs.unwatchFile(this._jadepath,this.recompile);
  },
  
  recompile : function(){
    var fn = "";
    
    if (this._jadepath){
      this._jade = fs.readFileSync(this._jadepath,"utf8");
      
      this._fn = jade.compile(this._jade,{ 
        compileDebug : this._debug,
        filename : this._jadepath
      });
      
      if (this._public && this._staticpath.length){
        fn = jade.compile(this._jade,{ 
          client : true, 
          compileDebug : this._debug,
          filename : this._jadepath
        });

        if (!fs.existsSync(path.dirname(this._staticpath)))
            mkdirp.sync(path.dirname(this._staticpath));
        
        fs.writeFileSync(this._staticpath,"var jade = window ? window.jade : (jade || {}); module.exports = " + fn.toString());
      }
    }
  },
  
  _debug : false,
  _public : false,
  _staticpath : "",
  
  unenumerable : [ "_jade", "_jadepath", "_fn", "_debug", "_public", "_staticpath" ],
  bind : [ "recompile" ],
  promisifyresult : [ "render" ]
});

Template.discover = function(basepath,config){
  // config.staticpath, config.public, config.debug can be functions of the file
  // if config.staticpath is a string it is used as prefix
  // if config.public is boolean it is used as is
  // if config.debug is boolean it is used as is
  var templates = {}, template = {};
  var files = findit.findSync(basepath).filter(function(v){ return v.search(/\.jade$/) > -1 && v.search('#') === -1; });
  
  config = config || {};
  
  for (var i=0; i<files.length; i++){
    template = { 
      path : path.resolve(basepath,files[i]),
      name : path.basename(files[i],".jade")
    };
    
    for (var vars=["name","public","staticpath","debug"], k=vars.pop(); k=vars.pop(); vars.length){
      if (config[k]){
        if (typeof(config[k])==="boolean")
          template[k] = config[k];
        else if (typeof(config[k])==="string" && k==="staticpath")
          template[k] = path.resolve(config[k],files[i]);
        else if (typeof(config[k])==="string")
          template[k] = config[k];
        else if (typeof(config[k])==="function")
          template[k] = config[k]({ 
            basepath : basepath, 
            relativepath : files[i].replace(basepath,"").replace(/^\//,''), 
            fullpath : files[i] 
          });
      }
    }
    
    templates[template.name] = new Template(template);
  }
  
  return templates;
};