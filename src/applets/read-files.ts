const fs = require('fs');
const path = require('path');

/**
 * Explores recursively a directory and returns all the filepaths and folderpaths in the callback.
 *
 * @see http://stackoverflow.com/a/5827895/4241030
 * @param {String} dir
 * @param {Function} done
 */
function fileWalker(dir, done) {
  let results = [];

  fs.readdir(dir, function(err, list) {
    if (err) return done(err);

    var pending = list.length;

    if (!pending) return done(null, results);

    list.forEach(function(file) {
      file = path.resolve(dir, file);

      fs.stat(file, function(err, stat) {
        // If directory, execute a recursive call
        if (stat && stat.isDirectory()) {
          // Add directory to array [comment if you need to remove the directories from the array]
          results.push(file);

          fileWalker(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);

          if (!--pending) done(null, results);
        }
      });
    });
  });
}

fileWalker(path.resolve(`./src/db`), function(err, data) {
  if (err) {
    throw err;
  }

  // ["c://some-existent-path/file.txt","c:/some-existent-path/subfolder"]
  console.log(data);

  data.map(filePath => {
    fs.stat(filePath, function(err, stats) {
      console.log(filePath.substring(filePath.indexOf('/src/db') + '/src/db'.length));
      // console.log(`${path.resolve(`./src/db`)}/${path.basename(filePath)}`);
      console.log(`${Number(stats.size / 1000).toFixed(0)}KB`, stats.birthtime, stats.mtime);
      console.log();

      // if (stats.isFile()) {
      //   console.log('    file');
      // }
      // if (stats.isDirectory()) {
      //   console.log('    directory');
      // }

      // console.log('    size: ' + stats['size']);
      // console.log('    mode: ' + stats['mode']);
      // console.log('    others eXecute: ' + (stats['mode'] & 1 ? 'x' : '-'));
      // console.log('    others Write:   ' + (stats['mode'] & 2 ? 'w' : '-'));
      // console.log('    others Read:    ' + (stats['mode'] & 4 ? 'r' : '-'));

      // console.log('    group eXecute:  ' + (stats['mode'] & 10 ? 'x' : '-'));
      // console.log('    group Write:    ' + (stats['mode'] & 20 ? 'w' : '-'));
      // console.log('    group Read:     ' + (stats['mode'] & 40 ? 'r' : '-'));

      // console.log('    owner eXecute:  ' + (stats['mode'] & 100 ? 'x' : '-'));
      // console.log('    owner Write:    ' + (stats['mode'] & 200 ? 'w' : '-'));
      // console.log('    owner Read:     ' + (stats['mode'] & 400 ? 'r' : '-'));

      // console.log('    file:           ' + (stats['mode'] & 0100000 ? 'f' : '-'));
      // console.log('    directory:      ' + (stats['mode'] & 0040000 ? 'd' : '-'));
    });
  });
});
