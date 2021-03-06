/**
 * progress.js
 * @author Christophe Parisse
 * handling socket and progress bar
 * Date: mai 2014
 * @module progress
 * @author Christophe Parisse
 */


var trjs = trjs || {};
trjs.progress = (function () {

    var NBPROGRESSBOX = 12;
    var pgBox = [];
    var actionBox = [];

    /**
     * create a progress box
     * @method progressBox
     * @param {string} id of box to be displayed
     */
    function box(idbox) {
        var s = '<div class="progress-box" id="progress-' + idbox + '">';
        s += '<div class="progress-left" id="progress-left-' + idbox + '"></div>';
        s += '<div class="progress-right" id="progress-right-' + idbox + '"></div>';
        s += '<div class="progress-text" id="progress-text-' + idbox + '">x</div></div>';
        $(s).appendTo('#progress');
    }

    /**
     * set value of a progress box
     * @method progressBoxSet
     * @param {string} id of box to be displayed
     * @param {int} value to be displayed
     */
    function setnth(idbox, nth) {
        show(idbox);
        var a = $('#progress-' + idbox);
        // console.log(idbox + '=' + nth);
        //a.find('progress-left-'+idbox).css('width', 150 * ((nth)/100) ); //nth+'%');
        //a.find('progress-right-'+idbox).css('width', 150 * ((100-nth)/100) ); // (100-nth)+'%');
        a.find('#progress-left-' + idbox).width(nth + '%'); // ', 150 * ((nth)/100) ); //);
        a.find('#progress-right-' + idbox).width((100 - nth) + '%'); // ', 150 * ((100-nth)/100) ); // );
        if (trjs.param.server === 'electron') {
            const remote = require('electron').remote;
            var listWnd = remote.process.listWindows;
            for (var i in listWnd) {
                if (listWnd[i]) {
                    listWnd[i].setProgressBar(nth/100);
                    break;
                }
            }
        }
    }

    /**
     * set message of a progress box
     * @method progressBoxSet
     * @param {string} id of box to be displayed
     * @param {string} value to be displayed
     */
    function setmsg(idbox, msg) {
        $('#progress-text-' + idbox).text(msg);
    }

    /**
     * initializa all the progress box (static boxes)
     * @method initProgressBox
     */
    function init() {
        trjs.progress.closeaction = null;
        pgBox = new Array(NBPROGRESSBOX);
        actionBox = new Array(NBPROGRESSBOX);
        for (var i = 0; i < NBPROGRESSBOX; i++) {
            box(i);
            setmsg(i, 'starting...');
            pgBox[i] = false;
            actionBox[i] = null;
        }
    }

    /**
     * find a free progress box
     * @method initProgressBox
     * @return [int] id of box
     */
    function find() {
        for (var i = 0; i < NBPROGRESSBOX; i++) {
            if (pgBox[i] === false) {
                pgBox[i] = '...';
                actionBox[i] = null;
                return i;
            }
        }
        return -1;
    }

    /**
     * closes a progress box
     * @method closePgBox
     * @param [int] id of box
     */
    function close(idbox) {
        pgBox[idbox] = false;
        hide(idbox);
        setmsg(idbox, 'starting...');
    }

    /**
     * hides a progress box
     * @method progressBoxHide
     * @param [int] id of box
     */
    function hide(idbox) {
        $('#progress-' + idbox).hide();
        var found = false;
        for (var i = 0; i < NBPROGRESSBOX; i++) {
            if (pgBox[i]) {
                found = true;
                break;
            }
        }
        if (found === false) {
            $('#progress').hide();
            //trjs.editor.resizeTranscript();
        }
        if (trjs.param.server === 'electron') {
            const remote = require('electron').remote;
//            remote.process.mainWindow.setProgressBar(0.0);
            var listWnd = remote.process.listWindows;
            for (var i in listWnd) {
                if (listWnd[i]) {
                    listWnd[i].setProgressBar(-1);
                    break;
                }
            }
        }
    }

    /**
     * displays a progress box
     * @method progressBoxShow
     * @param [int] id of box
     */
    function show(idbox) {
        $('#progress').show();
        $('#progress-' + idbox).show();
        //trjs.editor.resizeTranscript();
    }

    /**
     * sets the socket of a progress box
     * @method setIO
     * @param [int] id of box
     * @param [int] id of message
     */
    function setIO(idbox) {
        setnth(idbox, 0);
        // console.log("set box: " + idbox);
        var f = (global.applicationTarget.type === 'electron') ? require('electron').ipcRenderer : trjs.progress.socket;
        var a = f.on('media', handleMessage);
        // console.log('setIO Ok: ' + a);
    }

    function handleMessage(data) {
        // data --> start end processed+name
        // console.log('DATA: ' + data.box, data);
        if (data.start) {
            // console.log("START: " + data.start);
            if (trjs && trjs.log)
                trjs.log.alert(data.start); // attention à l'empilement des alertes
            else
                console.log('handleMessage:start: no log');
            if (trjs && trjs.editor)
                trjs.editor.resizeTranscript();
            else
                console.log('handleMessage:start: not in renderer (no trjs)');
        } else if (data.end) {
            // console.log("END: " + data.end);
            close(data.box);
            if (trjs && trjs.log)
                trjs.log.alert(data.end);
            else
                console.log('handleMessage:end: no log');
            closework(data.box);
            if (trjs && trjs.editor)
                trjs.editor.resizeTranscript();
            else
                console.log('handleMessage:end: not in renderer (no trjs)');
        } else {
            // console.log("PC: " + data.processed + ' ' + data.name);
            setnth(data.box, data.processed);
            setmsg(data.box, data.name + ' ' + data.processed + '%');
        }
    }

    function closework(idbox) {
        if (actionBox[idbox] !== null) {
            actionBox[idbox]();
            actionBox[idbox] = null;
        }
    }

    function closeallwork() {
        for (var i = 0; i < NBPROGRESSBOX; i++) {
            if (pgBox[i]) {
                actionBox[i]();
                actionBox[i] = null;
            }
        }
    }

    function closedefine(idbox, action) {
        actionBox[idbox] = action;
    }

    /**
     * set the function that displayed end of socket messages
     * @method setSocketOutput
     */
    function setSocketOutput() {
        var f = (global.applicationTarget.type === 'electron') ? require('electron').ipcRenderer : trjs.progress.socket;
        f.on('delete', function (data) {
            trjs.log.alert(data.msg);
            trjs.progress.closeallwork();
        });
    }

    return {
        setIO: setIO,
        handleMessage: handleMessage,
        box: box,
        setnth: setnth,
        setmsg: setmsg,
        close: close,
        show: show,
        hide: hide,
        find: find,
        init: init,
        closework: closework,
        closeallwork: closeallwork,
        closedefine: closedefine
    };

})();

if (typeof exports !== 'undefined') {
    for (var prop in trjs.progress) {
        exports[prop] = trjs.progress[prop];
    }
    // Object.keys(trjs.progress).forEach((x) => exports[x] = trjs.progress[x]);
}
