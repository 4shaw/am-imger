require('../store');

(function(window, angular) {
    "use strict";

    (function () {
        "use strict";

        var t = require('./imger.html');

        angular
            .module('imger', [])
            .component('imger', {
                template: t.default,
                bindings: {
                    store: "@",
                    complete: "&",
                    send: "&"
                },
                require: {},
                controllerAs: 'imger',
                controller: Imger
            });

        function Imger($scope, $element, $attrs, $reactive) {

            $reactive(this).attach($scope);

            var imger = this;

            imger.scaleSlider = 0;
            imger.storeDetails = ImgerStore.get(imger.store);
            imger.ready = false;

            var body = angular.element('body'),
                canvas = $element.find('#imger-canvas'),
                canvasContext = canvas[0].getContext('2d'),
                image = new Image(),
                freader = new FileReader(),
                fileInput = angular.element('<input type="file" />'),
                canvasWidth = imger.storeDetails.size.width || 100,
                canvasHeight = imger.storeDetails.size.height || 100,
                centerX = canvasWidth * 0.5,
                centerY = canvasHeight * 0.5,
                startDragOffset = {},
                translatePos = null,
                file, imageData, scale, minScale, staticAnchor, cornerRect, imageWidth, imageHeight, limitX, limitY, doneData;

            canvas.css({
                width: canvasWidth + 'px',
                height: canvasHeight + 'px'
            });

            canvas[0].width = canvasWidth;
            canvas[0].height = canvasHeight;

            fileInput.on('change', function () {
                file = fileInput[0].files[0];

                if(file.type.indexOf('image') > -1) {
                    freader.onload = function(e) {
                        imageData = e.target.result;
                        image.src = imageData;
                        image.onload = function () {
                            imageWidth = image.width;
                            imageHeight = image.height;

                            setNewImage();
                        };
                    };

                    freader.readAsDataURL(file);
                }
                else {
                    alert("Error! Selected file is not a recognized format");
                }
            });

            imger.done = function () {
                var mime = imger.storeDetails.mime || 'image/png',
                    quality = imger.storeDetails.quality || 0.95,
                    dataUrl = canvas[0].toDataURL(mime, quality),
                    data = {store: imger.store, blob: null, dataUrl: dataUrl};

                if(imger.send) {
                    //TODO checks
                    data.send = imger.send();
                    console.log("***", data);
                }

                if(!_.isUndefined($attrs.upload)) {
                    imger.call('imgerUpload', data, function (error, result) {
                        if(error) {
                            console.log("ERROR", error.reason);
                        }
                        else {
                            data.response = result;
                            handleCallback(data);
                        }
                    });
                }
                else {
                    handleCallback(data);
                }

                /*canvas[0].toBlob(function(blob) {

                    var data = {store: imger.store, blob: blob};

                    if(!_.isUndefined($attrs.upload)) {
                        imger.call('imgerUpload', data, function(error, result) {
                            if(error) {
                                console.log("ERROR", error.reason);
                            }
                            else {
                                handleCallback(data);
                            }
                        });
                    }
                    else {
                        handleCallback(data);
                    }
                }, mime, quality);*/
            };

            var handleCallback = function(data) {
                if(imger.complete) {
                    imger.complete({data: data});

                    if(!$scope.$$phase) $scope.$apply();
                }
            };

            imger.initBrowse = function(e) {
                fileInput.click();
            };

            if(!_.isUndefined($attrs.autobrowse)) {
                imger.initBrowse();
            }

            canvas.on('mousedown', onMouseDown);

            /**********************
             *
             * CANVAS METHODS
             *
             *********************/

            var setNewImage = function () {
                minScale = scale = Math.max((canvasWidth/imageWidth), (canvasHeight/imageHeight));

                staticAnchor = {
                    x: 0, y: 0,
                    width: centerX,
                    height: centerY,
                    imageWidth: (imageWidth * scale),
                    imageHeight: (imageHeight * scale),
                    scale: scale
                };

                cornerRect = {
                    width: centerX,
                    height: centerY
                };

                translatePos = {
                    x: 0,
                    y: 0
                };

                draw();

                imger.scaleSlider = 0;
                imger.ready = true;
                $scope.$apply();
            };

            imger.updateCanvas = function () {

                scale = minScale + ( (1 - minScale) * (imger.scaleSlider / 100) );

                cornerRect.width = staticAnchor.width * ((imageWidth * scale) / staticAnchor.imageWidth);
                cornerRect.height = staticAnchor.height * ((imageHeight * scale) / staticAnchor.imageHeight);

                translatePos.x = -(cornerRect.width - centerX);
                translatePos.y = -(cornerRect.height - centerY);

                limitX = canvasWidth - (imageWidth * scale);
                limitY = canvasHeight - (imageHeight * scale);

                draw();
            };

            var draw = function () {
                if(translatePos.x > 0) translatePos.x = 0;
                else if(translatePos.x < limitX) translatePos.x = limitX;

                if(translatePos.y > 0) translatePos.y = 0;
                else if(translatePos.y < limitY) translatePos.y = limitY;

                canvasContext.save();
                canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
                canvasContext.setTransform(scale, 0, 0, scale, translatePos.x, translatePos.y);
                canvasContext.drawImage(image, 0, 0);
                canvasContext.restore();
            };

            /**********************
             *
             * MOUSE EVENTS
             *
             *********************/

            function onMouseDown(e) {
                if(translatePos === null) return;

                startDragOffset.x = (e.clientX - translatePos.x);
                startDragOffset.y = (e.clientY - translatePos.y);

                body.on('mousemove', onMouseMove);
                body.on("mouseup", onDragEnd);
                body.on("mouseleave", onDragEnd);
            }

            function onMouseMove(e) {
                translatePos.x = (e.clientX - startDragOffset.x);
                translatePos.y = (e.clientY - startDragOffset.y);
                draw();
            }

            function onDragEnd(e) {
                staticAnchor.x = translatePos.x;
                staticAnchor.y = translatePos.y;
                staticAnchor.width = (-translatePos.x + centerX);
                staticAnchor.height = (-translatePos.y + centerY);
                staticAnchor.imageWidth = (imageWidth * scale);
                staticAnchor.imageHeight = (imageHeight * scale);
                staticAnchor.scale = scale;

                body.off('mousemove', onMouseMove);
                body.off("mouseup", onDragEnd);
                body.off("mouseleave", onDragEnd);
            }
        }

        Imger.$inject = ['$scope', '$element', '$attrs', '$reactive'];

    })();

})(window, window.angular);

