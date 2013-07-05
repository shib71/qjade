var test = require("tap").test;
var qjade = require("../index");
var temp = require("temp");
var fs = require("fs");
var Q = require("q");
var path = require("path");

test("qjade without path",function(t){
  t.plan(1);
  
  try {
    var template = new qjade({});
    
    t.fail("no error thrown");
  }
  catch(e){
    t.ok(true,"no path - expected error thrown");
  }
});
  
test("template for file that doesn't exist",function(t){
  t.plan(1);
  
  try {
    var template = new qjade({
      name : "test",
      path : "abcd.jade"
    });
    
    t.fail("no error thrown");
  }
  catch(e){
    t.ok(true,"file doesn't exist - expected error thrown");
  }
});

test("render",function(t){
  t.plan(1);
  
  temp.open({ suffix:".jade" },function(err,info){
    fs.writeSync(info.fd,"p testing");
    
    var template = new qjade({
      path : info.path
    });
    
    template.render().then(function(val){
      t.equal(val,"<p>testing</p>","simple render result");
    }).done();
  });
});

test("render with locals",function(t){
  t.plan(1);
  
  temp.open({ suffix:".jade" },function(err,info){
    fs.writeSync(info.fd,"p= abc");
    
    var template = new qjade({
      path : info.path
    });
    
    template.render({ abc:123 }).then(function(val){
      t.equal(val,"<p>123</p>","simple render result with locals");
    }).done();
  });
});

test("render with promise",function(t){
  t.plan(1);
  
  temp.open({ suffix:".jade" },function(err,info){
    fs.writeSync(info.fd,"p= abc");
    
    var p = Q.defer(), template = new qjade({
      path : info.path
    });
    
    template.render({ abc:p.promise }).then(function(val){
      t.equal(val,"<p>123</p>","simple render result with promise");
    }).done();
    
    p.resolve(123);
  });
});

test("public => static file",function(t){
  t.plan(2);
  
  temp.open({ suffix:".jade" },function(err,jadefile){
    fs.writeSync(jadefile.fd,"p testing");
    
    temp.open({ suffix:".js" },function(err,jsfile){
      var template = new qjade({
        path : jadefile.path,
        public : true,
        staticpath : jsfile.path
      });
      
      var stats = fs.statSync(jsfile.path);
      
      t.equal(stats.size > 0,true,"generated file has content");
      
      var staticRender = require(jsfile.path);
      
      t.equal(staticRender(),"<p>testing</p>","generated static file result");
    });
  });
});

test("not public => no static file",function(t){
  t.plan(1);
  
  temp.open({ suffix:".jade" },function(err,jadefile){
    fs.writeSync(jadefile.fd,"p testing");
    
    temp.open({ suffix:".js" },function(err,jsfile){
      var template = new qjade({
        path : jadefile.path,
        public : false,
        staticpath : jsfile.path
      });
      
      var stats = fs.statSync(jsfile.path);
      
      t.equal(stats.size === 0,true,"generated file has no content");
    });
  });
});

test("debug=true => debug code",function(t){
  t.plan(3);
  
  temp.open({ suffix:".jade" },function(err,info){
    fs.writeSync(info.fd,"p= a.b");
    
    var template = new qjade({
      path : info.path,
      debug : true
    });
    
    template.render({ a:{ b:10 } }).then(function(val){
      t.equal(val,"<p>10</p>","debug on - simple render result");
    }).done();
    
    template.render().then(function(val){
      t.fail("should have failed");
    },function(err){
      t.equal(err.toString(),"TypeError: "+info.path+":1\n  > 1| p= a.b\n\nCannot read property 'b' of undefined","threw expected error");
      t.equal(err.path,info.path,"error contains information about source file");
    }).done();
  });
});

test("debug=true => update render on file change",function(t){
  t.plan(2);
  
  temp.open({ suffix:".jade" },function(err,jadefile){
    fs.writeSync(jadefile.fd,"p testing");
    
    var template = new qjade({
      path : jadefile.path,
      debug : true
    });
    
    template.render().then(function(val){
      t.equal(val,"<p>testing</p>","debug on - initial render result");
      
      fs.writeFileSync(jadefile.path,"p test 2");
      
      return Q.delay(6000);
    }).then(function(){
      return template.render();
    }).then(function(val2){
      t.equal(val2,"<p>test 2</p>","debug on - updated render result");
    }).done();
  });
});

test("debug=true => update static file on source change",function(t){
  t.plan(3);
  
  var jadefile = temp.openSync({ suffix:".jade" });
  var jsfile = temp.openSync({ suffix:".js" });
  
  fs.writeSync(jadefile.fd,"p testing");
    
  var template = new qjade({
    path : jadefile.path,
    public : true,
    staticpath : jsfile.path,
    debug : true
  });
  
  var stats = fs.statSync(jsfile.path);
  
  t.equal(stats.size > 0,true,"generated file has content");
  
  var staticRender = require(jsfile.path);
  
  t.equal(staticRender(),"<p>testing</p>","generated static file result");
  
  fs.writeFileSync(jadefile.path,"p test 2");
  
  Q.delay(6000).then(function(){
    delete require.cache[jsfile.path];
    
    staticRender = require(jsfile.path);
    
    t.equal(staticRender(),"<p>test 2</p>","updated static file result");
  });
});

test("basic discovery",function(t){
  t.plan(3);
  
  var jadedir = temp.mkdirSync();
  
  fs.writeFileSync(path.join(jadedir,"some-file.jade"),"p hello world");
  fs.writeFileSync(path.join(jadedir,"another-file.jade"),"p abc");
  
  var templates = qjade.discover(jadedir);
  
  t.inequal(templates["some-file"],undefined,"first file discovered");
  t.inequal(templates["another-file"],undefined,"second file discovered");
  
  templates["some-file"].render().then(function(val){
    t.equal(val,"<p>hello world</p>","discovered templates are loaded");
  });
});

test("basic discovery",function(t){
  t.plan(3);
  
  var jadedir = temp.mkdirSync();
  
  fs.writeFileSync(path.join(jadedir,"some-file.jade"),"p hello world");
  fs.writeFileSync(path.join(jadedir,"another-file.jade"),"p abc");
  
  var templates = qjade.discover(jadedir);
  
  t.inequal(templates["some-file"],undefined,"first file discovered");
  t.inequal(templates["another-file"],undefined,"second file discovered");
  
  templates["some-file"].render().then(function(val){
    t.equal(val,"<p>hello world</p>","discovered templates are loaded");
  });
});

test("nested discovery",function(t){
  t.plan(5);
  
  var jadedir = temp.mkdirSync();
  
  fs.mkdirSync(path.join(jadedir,"dir1"));
  fs.mkdirSync(path.join(jadedir,"dir2"));
  
  fs.writeFileSync(path.join(jadedir,"dir1","a.jade"),"p hello world");
  fs.writeFileSync(path.join(jadedir,"dir1","b.jade"),"p abc");
  
  fs.writeFileSync(path.join(jadedir,"dir2","c.jade"),"p hello world");
  fs.writeFileSync(path.join(jadedir,"dir2","d.jade"),"p abc");
  
  var templates = qjade.discover(jadedir);
  
  t.inequal(templates["a"],undefined,"first file discovered");
  t.inequal(templates["b"],undefined,"second file discovered");
  t.inequal(templates["c"],undefined,"third file discovered");
  t.inequal(templates["d"],undefined,"fourth file discovered");
  
  templates["a"].render().then(function(val){
    t.equal(val,"<p>hello world</p>","discovered templates are loaded");
  });
});

test("discovery with public files",function(t){
  t.plan(6);
  
  var jadedir = temp.mkdirSync();
  var jsdir = temp.mkdirSync();
  
  fs.writeFileSync(path.join(jadedir,"public.jade"),"p hello world");
  fs.writeFileSync(path.join(jadedir,"private.jade"),"p abc");
  
  var templates = qjade.discover(jadedir,{
    public : function(file){
      return file.relativepath === "public.jade";
    },
    staticpath : function(file){
      return path.join(jsdir,path.basename(file.relativepath,".jade")) + ".js";
    }
  });
  
  t.equal(templates["public"].staticpath,path.join(jsdir,"public.js"),"public staticpath correct");
  t.equal(templates["public"].public,true,"public template has public set to true");
  t.ok(fs.existsSync(templates["public"].staticpath),"expected private file not created");
  t.equal(templates["private"].staticpath,path.join(jsdir,"private.js"),"private staticpath correct");
  t.equal(templates["private"].public,false,"private template has public set to false");
  t.notOk(fs.existsSync(templates["private"].staticpath),"expected private file not created");
});

test("discovery with custom names",function(t){
  t.plan(2);
  
  var jadedir = temp.mkdirSync();
  
  fs.writeFileSync(path.join(jadedir,"some-file.jade"),"p hello world");
  fs.writeFileSync(path.join(jadedir,"another-file.jade"),"p abc");
  
  var templates = qjade.discover(jadedir,{
    name : function(file){
      return path.basename(file.relativepath,".jade").replace(/[^\w]+/g,"");
    }
  });
  
  t.inequal(templates["somefile"],undefined,"first file renamed");
  t.inequal(templates["anotherfile"],undefined,"second file renamed");
});