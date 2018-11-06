/* @flow */
'use strict';

import type NodeContainer from './NodeContainer';
import { Bounds, parseBounds } from './Bounds';
import { TEXT_DECORATION } from './parsing/textDecoration';

import FEATURES from './Feature';
import { breakWords, toCodePoints, fromCodePoint } from './Unicode';

export class TextBounds {
    text: string;
    bounds: Bounds;

    constructor(text: string, bounds: Bounds) {
        this.text = text;
        this.bounds = bounds;
    }
}

export const parseTextBounds = (
    value: string,
    parent: NodeContainer,
    node: Text
): Array<TextBounds> => {
    var letterRendering = parent.style.letterSpacing !== 0;
    var textList = letterRendering ? (0, toCodePoints)(value).map(function (i) {
        return (0, fromCodePoint)(i);
    }) : (0, breakWords)(value, parent);
    var length = textList.length;
    var defaultView = node.parentNode ? node.parentNode.ownerDocument.defaultView : null;
    var scrollX = defaultView ? defaultView.pageXOffset : 0;
    var scrollY = defaultView ? defaultView.pageYOffset : 0;
    var textBounds = [];
    var offset = 0;

    var splittedText = [""];
    var topOffsets = [0];
    var index = 0;
    var bounds = [];

    for (var i = 0; i < length; i++) {
        var text = textList[i];
        if (parent.style.textDecoration !== TEXT_DECORATION.NONE || text.trim().length > 0) {
            if (FEATURES.SUPPORT_RANGE_BOUNDS) {
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
        } else if (!FEATURES.SUPPORT_RANGE_BOUNDS) {
            node = node.splitText(text.length);
        }
        offset += text.length;
    }

    for (var i = 0; i < splittedText.length; i++) {
        var trimmedText = splittedText[i].trim();
        textBounds.push(new TextBounds(trimmedText, getRangeBounds(node, 0, trimmedText.length, scrollX, scrollY + topOffsets[i])))
    }

    return textBounds;
};

const getWrapperBounds = (node: Text, scrollX: number, scrollY: number): Bounds => {
    const wrapper = node.ownerDocument.createElement('html2canvaswrapper');
    wrapper.appendChild(node.cloneNode(true));
    const parentNode = node.parentNode;
    if (parentNode) {
        parentNode.replaceChild(wrapper, node);
        const bounds = parseBounds(wrapper, scrollX, scrollY);
        if (wrapper.firstChild) {
            parentNode.replaceChild(wrapper.firstChild, wrapper);
        }
        return bounds;
    }
    return new Bounds(0, 0, 0, 0);
};

const getRangeBounds = (
    node: Text,
    offset: number,
    length: number,
    scrollX: number,
    scrollY: number
): Bounds => {
    const range = node.ownerDocument.createRange();
    range.setStart(node, offset);
    range.setEnd(node, offset + length);
    return Bounds.fromClientRect(range.getBoundingClientRect(), scrollX, scrollY);
};
