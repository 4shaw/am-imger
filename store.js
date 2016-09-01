ImgerStore = new function () {
    var store = {};

    this.add = function(options) {
        // TODO some checks
        _.extend(store, options);
    };

    this.get = function(what) {
        //return store;
        console.log(store);
        return store[what]();
    };
};

module.exports = ImgerStore;

ImgerCollection = new Mongo.Collection('imger');

if(Meteor.isServer) {
    Meteor.startup(function() {

        /*************************
         *
         * FILE SAVING
         *
         ************************/

        function saveLocalImage(base, path, filename, imageBuffer, callback) {
            var fs = require('fs'),
                mkdirp = require('mkdirp');

            var fullPath = base + '/' + path;

            mkdirp(fullPath, function (err) {
                if (err) throw new Meteor.Error(500, err);
            });

            fs.writeFile(fullPath + '/' + filename, imageBuffer, 'binary', function(err) {
                if (err) throw new Meteor.Error('500', err);
                else callback(null, true);
            });
        }

        var wrappedSaveLocalImage = Meteor.wrapAsync(saveLocalImage);

        /*************************
         *
         * HELPERS
         *
         ************************/

        function getPath(path) {
            if(path.substr(0, 1) !== '/') path = '/' + path;
            if(path.substr(-1) === '/') path = path.substring(0, -1);

            return path;
        }

        function getBase() {
            if(Meteor.isDevelopment) return process.env.PWD + '/.static';

            return '/static';
        }

        function insert(url, store, storeDetails) {
            return ImgerCollection.insert({
                url: url,
                store: store,
                size: storeDetails.size,
                created: new Date()
            });
        }

        function getExtention(type) {
            return type || 'png';
        }

        /*************************
         *
         * METEOR METHODS
         *
         ************************/

        function imgerUpload(data) {
            var dataUrlRegExp = /^data:image\/\w+;base64,/,
                base64Data = String(data.dataUrl).replace(dataUrlRegExp, ""),
                imageBuffer = new Buffer(base64Data, "base64"),
                storeDetails = ImgerStore.get(data.store),
                base = getBase(),
                path = getPath(storeDetails.path || '/images/' + data.store),
                fileName = Random.id() + "." + getExtention(storeDetails.type);

            var result = wrappedSaveLocalImage(base, path, fileName, imageBuffer);

            if(result) {
                var url = '/static' + path + '/' + fileName,
                    insertId = insert(url, data.store, storeDetails);

                if(storeDetails.server.onSaved) storeDetails.server.onSaved(insertId);

                return {id: insertId, url: url};
            }

            return result;
        }

        Meteor.methods({
            imgerUpload: imgerUpload
        });
    });
}

//module.exports = ImgerCollection;
