'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.parseTextBounds = exports.TextBounds = undefined;

var _Bounds = require('./Bounds');

var _textDecoration = require('./parsing/textDecoration');

var _Feature = require('./Feature');

var _Feature2 = _interopRequireDefault(_Feature);

var _Unicode = require('./Unicode');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TextBounds = exports.TextBounds = function TextBounds(text, bounds) {
    _classCallCheck(this, TextBounds);

    this.text = text;
    this.bounds = bounds;
};

var parseTextBounds = exports.parseTextBounds = function parseTextBounds(value, parent, node) {
    node.textContent = node.textContent.replace(/−/g, "-");
    var letterRendering = parent.style.letterSpacing !== 0;
    var textList = letterRendering ? (0, _Unicode.toCodePoints)(value).map(function (i) {
        return (0, _Unicode.fromCodePoint)(i);
    }) : (0, _Unicode.breakWords)(value, parent);
    var length = textList.length;
    var defaultView = node.parentNode ? node.parentNode.ownerDocument.defaultView : null;
    var scrollX = defaultView ? defaultView.pageXOffset : 0;
    var scrollY = defaultView ? defaultView.pageYOffset : 0;

    var scrollYPlusOffset = scrollY;

    var textBounds = [];
    var offset = 0;

    var splittedText = [""];
    var topOffsets = [0];
    var index = 0;
    var bounds = [];

    for (var i = 0; i < length; i++) {
        var text = textList[i];
        if (parent.style.textDecoration !== _textDecoration.TEXT_DECORATION.NONE || text.trim().length > 0) {
            if (_Feature2.default.SUPPORT_RANGE_BOUNDS) {
                var newBound = getRangeBounds(node, offset, text.length, scrollX, scrollY);
                bounds.push(newBound);

                if (bounds.length > 1 && bounds[i].top !== bounds[i - 1].top) {
                    index++;
                    splittedText[index] = "";
                    topOffsets[index] = bounds[i].top - bounds[i - 1].top;
                }

                splittedText[index] += text;
            } else {
                var replacementNode = node.splitText(text.length);
                textBounds.push(new TextBounds(text, getWrapperBounds(node, scrollX, scrollY)));
                node = replacementNode;
            }
        } else if (!_Feature2.default.SUPPORT_RANGE_BOUNDS) {
            node = node.splitText(text.length);
        }
        offset += text.length;
    }

    for (var i = 0; i < splittedText.length; i++) {
        scrollYPlusOffset += topOffsets[i];

        var trimmedText = splittedText[i].trim();
        var rangeBounds = getRangeBounds(node, 0, trimmedText.length, scrollX, scrollYPlusOffset);
        if (rangeBounds.height > topOffsets[i]) rangeBounds.height -= topOffsets[i];
        textBounds.push(new TextBounds(trimmedText, rangeBounds));
    }

    return textBounds;
};

var getWrapperBounds = function getWrapperBounds(node, scrollX, scrollY) {
    var wrapper = node.ownerDocument.createElement('html2canvaswrapper');
    wrapper.appendChild(node.cloneNode(true));
    var parentNode = node.parentNode;
    if (parentNode) {
        parentNode.replaceChild(wrapper, node);
        var bounds = (0, _Bounds.parseBounds)(wrapper, scrollX, scrollY);
        if (wrapper.firstChild) {
            parentNode.replaceChild(wrapper.firstChild, wrapper);
        }
        return bounds;
    }
    return new _Bounds.Bounds(0, 0, 0, 0);
};

var getRangeBounds = function getRangeBounds(node, offset, length, scrollX, scrollY) {
    var range = node.ownerDocument.createRange();
    range.setStart(node, offset);
    range.setEnd(node, offset + length);
    return _Bounds.Bounds.fromClientRect(range.getBoundingClientRect(), scrollX, scrollY);
};