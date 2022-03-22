
export function setStyle(dom, cssObj) {
    Object.keys(cssObj || {}).forEach(function (key) {
        dom.style[key] = cssObj[key];
    });
}

/**
 * 检查 是否是 HTML 元素
 *
 * @param obj
 * @returns {boolean}
 */
function isHTMLElement(obj) {
    try {
        return !!obj.cloneNode(true);
    } catch (e) {
        return false;
    }
}

/**
 * 创建 html
 *
 * @param element
 * @param attrs
 * @param children
 * @returns {any}
 */
export function createElement(element, attrs, children) {
    const elementNode = document.createElement(element);

    if (attrs && typeof attrs === 'object') {
        for (let key in attrs) {
            if (key === 'style') {
                setStyle(elementNode, attrs['style']);
            } else {
                elementNode.setAttribute(key, attrs[key])
            }
        }
    }

    if (children) {
        if (Array.isArray(children)) {
            children.forEach(function (child) {
                if (isHTMLElement(child)) {
                    elementNode.appendChild(child)
                }
            })
        } else {
            if (isHTMLElement(children)) {
                elementNode.appendChild(children)
            }
        }
    }

    return elementNode
}

/**
 * 创建 文本节点
 *
 * @param string
 * @return {Text}
 */
export function createText(string = '') {
    return document.createTextNode(string);
}

export function controlEle(iconName, titleTips, icon) {
    const $icon = createElement('div', { class: `jessibuca-icon jessibuca-icon-${ iconName }`}, icon);
    const $title = createElement('span', { class: 'icon-title' }, createText(titleTips));
    const $tips = createElement('span', { class: 'icon-title-tips' }, $title);
    const $control = createElement(
        'div',
        { class: `jessibuca-controls-item jessibuca-${ iconName }` },
        [$icon, $tips]
    );

    $control.$icon = $icon;
    $control.$title = $title;
    $control.$tips = $tips;

    return $control;
}

export function getSvgIcon(createIcon, options = {}) {
    if (!options.style) {
        options.style = 'width: 1.2rem; height: 1.2rem;'
    }

    const template = document.createElement('template');
    template.innerHTML = createIcon(options);

    return template.content.childNodes
}

/**
 * 根据状态 显示隐藏
 * @param status
 * @param node
 * @param nodeActive
 */
export function toggleStatus (status, node, nodeActive) {
    if (status) {
        node.style.display = 'none';
        nodeActive.style.display = 'flex';
    } else {
        node.style.display = 'flex';
        nodeActive.style.display = 'none';
    }
}

/**
 * 根据状态 显示隐藏
 * @param status
 * @param node
 * @param cls
 */
export function toggleClassActiveByStatus (status, node, cls) {

    if (status) {
        setStyle(node, cls)
    } else {
        setStyle(node, `${cls}-active`)
    }
}


export function listener (element, type, callback) {
    // 支持使用 addEventListener()
    if (element.addEventListener) {
        if (type.slice(0,2) === "on") // 以 "on" 开头，不需要，则去掉
            type = type.slice(2);
        element.addEventListener(type, callback, false);
        return () => {
            element.removeEventListener(type, callback, false);
        }
    }
    // 支持使用 attachEvent()
    if (element.attachEvent) {
        if (type.slice(0, 2) !== "on") // 没有以 "on" 开头，需要，则加上
            type = "on" + type;
        element.attachEvent(type, callback);
        return () => element.detachEvent(type, callback)
    } else {
        if (type.slice(0, 2) !== "on") {
            type = 'on'+ type
        }

        element[type] = callback;

        return () => {
            delete element[type]
        }
        // type.slice(0, 2) !== "on" ? element['on'+ type] = callback : element[type] = callback;
    }
}

export function on (dom, type, cb, stop = true) {
    if (dom) {
        return listener(dom, type, (e) => {
            stop && e.stopPropagation();
            cb && cb(e)
        })
    } else return () => {}
}

// 截流函数：调用后在限时内执行一次，限时内再次调用，
// 函数执行判断条件为关闭状态，函数不执行，函数执行后判断条件打开.
export function throttle(func, limit) {
    let inThrottle; // 开关
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => {
                // 定时器用来进行保证在一定时间内开关的状态
                inThrottle = false;
            }, limit);
        }
    };
}
