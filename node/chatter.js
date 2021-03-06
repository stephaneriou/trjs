/**
 * chatter.js
 * Interface with CHATTER program from Franklin Chen, CHILDES
 * @author Christophe Parisse
 */

var cp = require('child_process');
var temp = require('fs-temp');
var version = require('../editor/version.js');

exports.chatter0 = function(utts, lang, callback) {
    var text = '';
    text += '@UTF8\n';
    text += '@Begin\n';
    text += '@Languages:\t' + lang + '\n';
    text += '@Participants:	SP01 Participant\n';
    text += '@ID:\t' + lang + '|change_corpus_later|SP01|||||Participant|||\n';
    for (var i in utts) {
        text += '*SP01:\t' + utts[i] + '\n';
    }
    text += '@End\n';
    // fs.writeFileSync('tempchatfile.cha', text);
    var tempchatfile = temp.template("%s.cha").writeFileSync(text);
    console.log("tempfile:", tempchatfile);

    var output = '', error = '';
    var analyzer = cp.spawn(version.javaLoc(), ['-cp', version.ffmpegdirLoc() + '/chatter.jar',
        'org.talkbank.chatter.App', tempchatfile]);

    analyzer.stdout.on('data', function(data) {
        if (data) output += data;
        // console.log("out", data.toString());
    });

    analyzer.stderr.on('data', function(data) {
        if (data) error += data;
        // console.log("err", data.toString());
    });

    analyzer.on('close', function(code) {
        if (code === 0) {
            callback(0, output);
//            fs.unlinkSync(tempchatfile);
            return;
        } else {
            callback(1, error);
//            fs.unlinkSync(tempchatfile);
            return;
        }
    });
}

exports.chatter = function(utts, lang, callback) {
    exports.chatter0(utts, lang, function (err, messg) {
        if (err) {
            var errors = [], m;
            // filter messgs for line and column
            var re = /line (\w+), column (\w+): (.*?)$/gm;
            do {
                m = re.exec(messg);
                if (m && m[3].indexOf('internal error') < 0) {
                    // console.log(m[1]-4, m[2]-7);
                    errors.push([m[1]-4, m[2]-7, m[3]]);
                }
            } while (m);
            callback(1, errors);
        } else {
            // <u who="SP01" uID="u0">
            var xml = '';
            // filter <u ..>.*</u>
            var re = /<u who=\"SP01\" uID=\"u0\">([\s\S]*)<\/u>/m;
            var m = re.exec(messg);
            // console.log(m);
            if (m) {
                // console.log(m[1]);
                xml = m[1];
            }
            callback(0, xml);
        }
    });
}
