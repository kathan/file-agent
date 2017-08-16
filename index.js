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
    if(!fs.existsSync(in_fldr)){
      return fs.mkdir(in_fldr, (err)=>{
        if(!err){
          in_folder = in_fldr;
          result = true;
        }else{
          result = false;
        }
        if(is_active){
          self.start();
        }
        cb(result);
      });
      
    }
    in_folder = in_fldr;
    result = true;
    
    if(is_active){
      this.start();
    }
    cb(result);
  }
  
  this.setOutFolders = function(out_fldrs){
    if(Array.isArray(out_fldrs)){
      for(var i in out_fldrs){
        var out_fldr = out_fldrs[i];
        if(!fs.existsSync(out_fldr)){
          if(fs.mkdirSync(out_fldr)){
            var out_ary = out_fldr.split('/');
            for(var j in out_ary){
              if(out_ary[j] === ''){
                out_ary.splice(j, 1);
              }
            }
            //console.log(out_ary);
            out_folders[out_ary.pop()] = out_fldr;
          }
        }else{
          var out_ary = out_fldr.split('/');
          for(var j in out_ary){
            if(out_ary[j] === ''){
              out_ary.splice(j, 1);
            }
          }
          out_folders[out_ary.pop()] = out_fldr;
        }
      }
    }else{
      return false;
    }
  }
  
  this.setFailedFolder = function(fld_fldr){
    if(!fs.existsSync(fld_fldr)){
      if(fs.mkdirSync(fld_fldr)){
        failed_folder = fld_fldr;
        return true;
      }else{
        return false;
      }
    }else{
      failed_folder = fld_fldr;
      return true;
    }
  }
  
  this.setFunction = function(fn){
    var is_active = active;
    this.stop();
    func = fn;
    if(is_active){
      this.start();
    }
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
  
  this.start = function(){
    if(!active && fs.existsSync(in_folder)){
      //console.log(in_folder);
      watcher = fs.watch(in_folder, wrapperFunction);
      active = true;
    }
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
  this.setOutFolders(out_fldrs);
  this.setFailedFolder(fld_fldr);
  this.setFunction(fn);
  this.setInFolder(in_fldr, (re)=>{
    //console.log('result', re);
    callback(this, re);
  });
  
}


FileAgent.prototype.constructor = FileAgent;
module.exports = FileAgent;