//https://medium.com/@garychambers108/better-logging-in-node-js-b3cc6fd0dafd

["log", "warn", "error"].forEach(function(method) {
    var oldMethod = console[method].bind(console);
    console[method] = function() {
        var arg=[new Date().toISOString()];
        for(var i in arguments){
          arg.push(arguments[i]);
        }
        oldMethod.apply(console, arg );
    };
});


console.log("LOG ALL THE THINGS!!1!");
console.error("LOG ALL THE THINGS!!1!", 1234, true, {a:1,b:2});


