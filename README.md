# file-agent
A lighweight library written in node.js to automate hot folders.
```js
var Process = require('file-agent'),
    /*
    parameters:
        in folder path (string)
        out folder paths (array)
        failed folder path (string)
        callback (function)
          returns: event type (rename' or 'change)
          filename: Name of item that has appeared in the folder
          in_folder: The current in folder being watched
          out_folders: The array of possible out folders
          failed_folder: The folder where failed items will go
          done: Callback that must be called when the file is done being processed.
    */
    p = Process(`${__dirname}/in/`, [`${__dirname}/out1/`, `${__dirname}/out2/`], `${__dirname}/failed/`, (eventType, filename, in_folder, out_folders, failed_folder, done)=>{
      // fire this function any time an item appears in the folder
      var d = new Date()
      done(null, 'out2');
    }, (p, re)=>{
      // process has been created
      p.start();//start the process
    }
);
```
