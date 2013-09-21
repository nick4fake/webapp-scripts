app.fn.postiframe = function (href, optionsin, data) {
    var pref = app.queryPrefix ? app.queryPrefix + '/' : '';
    var options = {
        fitToView: false,
        autoSize:  true,
        href:      pref + href
    };
    var toString = function (el) {
        if (!el && el !== 0) {
            return '';
        }
        if (typeof el == 'object') {
            return $.toJSON(el);
        }
        return el;
    };
    $.extend(options, optionsin);
    $.extend(options, {
        type:      'iframe',
        afterLoad: (function () {
            var frame = $(this.content[0]);
            var form = $('<form action="' + options.href + '" method="POST"></form>');
            for (var name in data) {
                form.append(
                    $('<input type="hidden"/>').
                        attr('name', name).
                        attr('value', toString(data[name]))
                );
            }

            frame.contents().find('body').html('').append(form);
            form.submit();
        })
    });
    $.fancybox(options);
};