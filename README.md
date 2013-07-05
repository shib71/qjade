qjade
=====

A wrapper for jade templates to add transparent support for promise locals, among other things.

    var qjade = require("qjade"), path = require("path");
    
    var newtemplate = new qjade({ 
      path : path.join(__dirname,"somefile.jade"),
      pubic : true,
      staticpath : path.join(__dirname,"somefile.js")
    });
    
    newtemplate.render({
      somevalue : Q(10)
    }).then(function(html){
      console.log(html);
    });

## `new qjade(config)`

Config options:

* *name*: name of the template
* *path*: full path for the jade template
* *public*: turns on generation of static JS templates - these are requirable
* *staticpath*: full path for the static JS template
* *debug*: includes debug code in compiled templates (including the static JS), and sets up a watch on the jade file to automatically recompile templates when they change

All of these options can be passed into the initialization config or set on the resulting object afterwards.

### `render(locals)`

Runs the template and returns a promise that will be fulfilled with the resulting HTML. The optional locals hash can contain promises at any depth, even nested.

### `recompile()`

Recompiles the render function, and the static JS file if appropriate, from the source jade file.

## Automatic Discovery

    var qjade = require("qjade"), path = require("path");
    
    var templates = qjade.discover(__dirname,{
      name : function(file){
        return file.relativepath.replace(/\.jade$/,"");
      }
    });
    
    templates["views/somefile"].render().then(function(html){
      console.log(html);
    });

### `discover(basepath,config)`

Walks a specified directory, automatically loading found jade files, and returning resulting hash.

Config options:

* *name*: a function that accepts a file hash and returns the template name
* *public*: a boolean OR a function that accepts a file hash and returns a boolean
* *staticpath*: a path string OR a function that accetps a file hash and returns a path. If this is a string, it is prepended to the file's relative path.
* *debug*: a boolean OR a function that accepts a file hash and returns a boolean

The hash passed into the functions contains basepath, relativepath, and fullpath of the jade file.