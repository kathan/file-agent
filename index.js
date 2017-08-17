"use strict";
var fs = require('fs'),
    url = require('url'),
    ignore = ['.DS_Store'],
    Async = require('async'),
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
    var is_active = active;
    this.stop();
    ensureFolder(in_fldr, (result)=>{
      if(result){
        in_folder = in_fldr;
        result = true;
      }
      if(is_active){
        return this.start((re) => {
          cb(re);
        });
      }
      cb(result);
    });
  }
  
  this.setOutFolders = function(out_fldrs, cb){
    //console.log('setting out folders...');
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
      }
      return cb(result);
    });
  }
  
  this.setFunction = function(fn, cb){
    var is_active = active;
    this.stop();
    func = fn;
    if(is_active){
      return this.start(()=>{
        cb();
      });
    }
    return cb();
  }
  
  function ensureFolder(path, cb){
    
    if(!fs.existsSync(path)){
      var path_ary = path.split('/'),
          cur_path = '/',
          p = 0;
      
      path_ary.forEach((cur_fldr, i)=>{
        if(cur_fldr !== ''){
          cur_path += cur_fldr+'/';
          
          if(!fs.existsSync(cur_path)){
            
            fs.mkdir(cur_path, (err)=>{
              p++;
              if(err){
                console.log('Error creating', cur_path, err);
                return cb(false);
              }
              
              if(p === path_ary.length) {
                console.log('Created', cur_path);
                cb(true);
              }
            }); 
          }
        }
      });
    }else{
      console.log(path, 'exists');
      cb(true);
    }
  }
  
  function wrapperFunction(eventType, filename){
    var orig_path = in_folder+ filename,
        new_path = failed_folder+ filename;
        
    //console.log('wrapperFunction', eventType, filename, orig_path, fs.existsSync(orig_path));
    if(ignore.indexOf(filename) === -1 && fs.existsSync(orig_path)){
      //self.stop();
      func(eventType, filename, in_folder, out_folders, failed_folder, (err, out)=>{
        console.log('Found', orig_path);
        if(out && out_folders[out]){
          if(fs.existsSync(out_folders[out])){
            new_path = url.resolve(out_folders[out], filename);
          }
        }
        
        if(fs.existsSync(orig_path)){
          console.log('Moving', orig_path, '->', new_path);
          fs.rename(orig_path, new_path, ()=>{
            //self.start(()=>{});
          });
        }
        //self.start();
      });
    }
  }
  
  this.start = function(cb){
    
    ensureFolder(in_folder, (result) => {
      
      if(!active && fs.existsSync(in_folder)){
        //console.log('Setting watch on', in_folder);
        watcher = fs.watch(in_folder, wrapperFunction);
        console.log('Watching', in_folder);
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
  var out = (resolve, reject) => {
    //console.log('Going to set out folders');
    this.setOutFolders(out_fldrs, (result)=>{
      if(result){
        resolve();
      }else{
        reject('Could not ensure out folders.');
      }
    });
  },
  failed = (resolve, reject) => {
    //console.log('Going to set failed folder');
    this.setFailedFolder(fld_fldr, (result)=>{
      if(result){
        resolve();
      }else{
        reject('Could not ensure failed folder.');
      }
    });
  },
  inf = (resolve, reject) => {
    //console.log('Going to set in folder');
    this.setInFolder(in_fldr, (result)=>{
      if(result){
        //console.log('Set in folder');
        resolve();
      }else{
        reject('Could not ensure in folder.');
      }
    });
  },
  fun = (resolve)=>{
    //console.log('Going to set function');
    this.setFunction(fn, ()=>{
      //console.log('Set function');
      resolve();
    });
  },
  done = new Promise(()=>{
    //console.log('done')
    callback(null, self);
  });
  //Promise.all([out, failed, inf, fun]).then(
  Async.parallel([out, failed, inf, fun],
  (val)=>{
    //console.log('done')
    callback(null, self);
  });
}

FileAgent.prototype.constructor = FileAgent;
module.exports = FileAgent;