(function ($, classTouchable, classTouched, touchAvailable) {
    if (!touchAvailable) {
        $.fn.touchable = function () {
            return this;
        };
        return;
    }

    var bindEvents = function (el, fn) {
        el.bind('touchstart', fn);
    };
    var clearTouch = (function (els) {
        els.each(function () {
            if ($(this).hasClass(classTouched)) {
                $(this).removeClass(classTouched).trigger('untouch');
            }
        });
    });
    $(document).ready(function () {
        bindEvents($(document.body), function (e) {
            clearTouch($(document.body).find('.' + classTouchable));
            // TODO: propagate
        })
    });

    $.fn.touchable = function (circular) {
        bindEvents(this, function (e) {
            e.stopPropagation();
            if ($(this).prop('disabled')) {
                return;
            }
            var el = $(this);
            if (el.hasClass(classTouched)) {
                if (circular) {
                    var els = el.closest('.' + classTouched);
                    while (els.size()) {
                        els.removeClass(classTouched).trigger('untouch');
                        els = el.closest('.' + classTouched);
                    }
                }
                el.removeClass(classTouched).trigger('untouch');
                return;
            }
            var cls = classTouched + 'Now';
            var els = $();
            while (el.get(0) != document.body) {
                if (el.hasClass(classTouchable)) {
                    els = els.add(el.get(0));
                    el.addClass(classTouched).addClass(cls);
                }
                el = el.parent();
            }
            clearTouch($(document.body).find('.' + classTouchable).filter(':not(.' + cls + ')'));
            els.removeClass(cls);
            $(this).trigger('touch');
        });
        return this.addClass(classTouchable);
    };
})(jQuery, 'global-touchable', 'touched', Modernizr.touch);