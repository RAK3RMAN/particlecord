/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
App/Filename : particlecord/exit_options.js
Author       : RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

//Check if in testing environment, run tests, exit
exports.testCheck = function () {
    let testENV = process.env.testENV || process.argv[2];
    if (testENV === "test") {
        console.log('Started in testing environment - exiting program');
        process.exit(0);
    }
};
