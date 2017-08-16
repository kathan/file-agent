"use strict";
var fs = require('fs'),
    url = require('url'),
    ignore = ['.DS_Store'],
FileAgent = function(in_fldr, out_fldrs, fld_fldr, fn, callback){
  if ( !(this instanceof FileAgent) ){return new FileAgent(in_fldr, out_fldrs, fld_fldr, fn, callback);}
  var in_folder,
      out_folders = {},
      failed_folder,
      func,
      watcher,
      active = false,
      self = this;
      
  this.setInFolder = function(in_fldr, cb){
    var result, is_active = active;
    this.stop();
    if(ensureFolder(in_fldr)){
      in_folder = in_fldr;
      result = true;
    }
    
    if(is_active){
      this.start();
    }
    cb(result);
  }
  
  this.setOutFolders = function(out_fldrs, cb){
    if(Array.isArray(out_fldrs)){
      out_fldrs.forEach((out_fldr, i) => {
        ensureFolder(out_fldr, (result)=>{
          if(!result){
            return cb(false);
          }
        });
      });
      return cb(true);
    }else{
      return cb(false);
    }
  }
  
  this.setFailedFolder = function(fld_fldr, cb){
    ensureFolder(fld_fldr, (result)=>{
      if(result){
        failed_folder = fld_fldr;
        return cb(true);
      }
      return cb(false);
    });
  }
  
  this.setFunction = function(fn){
    var is_active = active;
    this.stop();
    func = fn;
    if(is_active){
      this.start();
    }
  }
  
  function ensureFolder(path, cb){
    console.log('exists', path);
    if(!fs.existsSync(path)){
      var path_ary = path.split('/'),
          cur_path = '/',
          p = 0;
      
      path_ary.forEach((cur_fldr, i)=>{
        var cur_path += cur_fldr+'/';
        if(!fs.existsSync(cur_path)){
          fs.mkdir(cur_path, (result)=>{
            p++;
            if(!result){
              return cb(false);
            }
            console.log('created', cur_path);
            if(p === path_ary.length) {
              cb(false);
            }
          }); 
        }else{
          console.log(cur_path, 'exists');
        }
      });
    }
    console.log(path, 'exists');
    cb(true);
  }
  
  function wrapperFunction(eventType, filename){
    var orig_path = url.resolve(in_folder, filename),
        new_path = url.resolve(failed_folder, filename);
    if(ignore.indexOf(filename) === -1 && fs.existsSync(orig_path)){
      self.stop();
      func(eventType, filename, in_folder, out_folders, failed_folder, (err, out)=>{
        if(out && out_folders[out]){
          if(fs.existsSync(out_folders[out])){
            new_path = url.resolve(out_folders[out], filename);
          }
        }
        
        if(fs.existsSync(orig_path)){
          console.log('Moving', orig_path, '->', new_path);
          fs.rename(orig_path, new_path, ()=>{
            self.start();
          });
        }
        //self.start();
      });
    }
  }
  
  this.start = function(cb){
    ensureFolder(in_folder, (result) => {
      if(!active && fs.existsSync(in_folder)){
        //console.log(in_folder);
        watcher = fs.watch(in_folder, wrapperFunction);
        active = true;
        return cb(true);
      }
      return cb(false);
    });
  }
  
  this.stop = function(){
    if(active){
      watcher = fs.watch(in_folder);
      active = false;
    }
  }
  //Scalar.call(this);//For subclass
  Object.assign(this, {});
  /* Constructor code */
  var out = new Promise((resolve) => {
    console.log('Setting out folder');
    this.setOutFolders(out_fldrs, (result)=>{
      if(result){
        resolve();
      }else{
        callback('Could not ensure out folders.');
      }
    });
  }),
  failed = new Promise((resolve) => {
    this.setFailedFolder(fld_fldr, (result)=>{
      if(result){
        resolve();
      }else{
        callback('Could not ensure failed folder.');
      }
    });
  }),
  inf = new Promise((resolve) => {
    this.setInFolder(in_fldr, (result)=>{
      if(result){
        resolve();
      }else{
        callback('Could not ensure in folder.');
      }
    });
  }),
  fun = new Promise((resolve)=>{
    this.setFunction(fn, ()=>{
      resolve();
    });
  });
  Promise.all([out, failed, inf, fun]).then(()=>{
    callback();
  });
}

FileAgent.prototype.constructor = FileAgent;
module.exports = FileAgent;