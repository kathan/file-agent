# file-agent
A lightweight library written in node.js to automate hot folders.
Example:
```js
var Process = require('file-agent'),
    /*
    parameters:
        in folder path (string): The folder that will be watched. ** Use trailing slash ***
        out folder paths (array): The folder(s) where the completed files can be moved to. ** Use trailing slash ***
        failed folder path (string): The folder where failed items will be moved to. ** Use trailing slash ***
        callback (function)
          returns: event type (rename' or 'change)
          filename: Name of item that has appeared in the folder
          in_folder: The current in folder being watched
          out_folders: The array of possible out folders
          failed_folder: The folder where failed items will go
          done: Callback that must be called when the file is done being processed.
            parameters:
                error
                out folder
    */
    p = Process(`${__dirname}/in/`, [`${__dirname}/out1/`, `${__dirname}/out2/`], `${__dirname}/failed/`, (eventType, filename, in_folder, out_folders, failed_folder, done)=>{
      // fire this function any time an item appears in the folder
      var d = new Date();
      console.log(d.toString(), in_folder, '->', out_folders[1]);
      done(null, 'out2');
    }, (p, re)=>{
      // process has been created
      p.start();//start the process
    }
);
```
## API
### Constructor
#### parameters:
        in folder path (string)
        out folder paths (array)
        failed folder path (string)
        file callback (function)
          returns: event type (rename' or 'change)
          filename: Name of item that has appeared in the folder
          in_folder: The current in folder being watched
          out_folders: The array of possible out folders
          failed_folder: The folder where failed items will go
          done: Callback that must be called when the file is done being processed.
        constructor callback (function)
            returns 
                FileAgent object

### FileAgent class
#### Methods:
##### setInFolder 
      parameters:
        in_fldr: (string): Path of in folder
        callback (function): Called when in folder has been set.
          returns result true:false
          
##### setOutFolders
      parameters:
        out_fldrs: (array): Array of out folder paths.
        callback (function): Called when out folders have been set.
          returns result true:false

##### setFailedFolder
      parameters:
        out_fldrs: (string): Path of failed folder path.
        callback (function): Called when failed folder has been set.
          returns result true:false
          
##### setFunction
      parameters:
        fn: (function): Function to be called for each file that appears in the "in" folder.
        callback (function): Called when function has been set.
          returns result true:false
          
##### start
        Call this method to start watching the "in" folder.
    
##### stop
        Call this method to stop watching the "in" folder.
