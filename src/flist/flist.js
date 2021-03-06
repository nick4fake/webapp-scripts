/* LIST FILTERED
 * by Bogdan Yurov <bogdan@yurov.me> aka nick4fake
 * version 0.4, 2012
 * Пояснения к сеттерам:
 * text = column.setter.call(row, text, cont, td, tr, summary); - вызов сеттера
 * row - текущая строка данных (из джейсон) он же внутри сеттера this
 * text - данные для этой ячечки
 * cont - контейнер (div)
 * td - собственно ячейка
 * tr - строка
 * summary - итоги (если они есть!)
 */
void function ($, generalClass) {
    "use strict";

    var defSettings = {
        bools:          {
            btrue:  'да',
            bfalse: 'нет'
        },
        panel:          null,
        paging:         null,
        disable_submit: false,
        noresMessage:   'Ничего не найдено',
        colregex:       {
            exp:   /^(.*\s)?col-([a-z0-9_A-Z]+)(\s.*)?$/,
            index: 2
        },
        pagingParams:   {
            num_edge_entries:    1,
            num_display_entries: 4,
            callback:            null,
            items_per_page:      1,
            current_page:        null
        },
        forceSummary:   true
    };

    var f = {
        bindFormUpdate: function (context, settings) {
            var form = $(context.form);
            var xhr;
            var page;
            if (settings.paging) {
                page = $('<input type="hidden" name="page" />').attr('value', 1);
                page.appendTo(form);
            }
            form.submit(function (e) {
                e.preventDefault();
                if (xhr) {
                    xhr.abort();
                }
                context.updateState();
                var post = form.formSerialize();
                app.log('List request', form, post);
                xhr = $fn.query(form.attr('action'), function (data) {
                    data.countPage = Math.max(data.countPage, 1);
                    form.trigger('xhr', data);
                    if (data.data) {
                        form.trigger('xhrdata', data.data);
                    }
                    if (data.res) {
                        context.updateState(data.res);
                    } else if (!data.countTotal) {
                        context.updateState(settings.noresMessage);
                    } else {
                        context.updateState(data.rows, data.summary);
                    }
                    if (page) {
                        if (data.countPage < page.attr('value')) {
                            page.attr('value', Math.max(1, data.countPage));
                            form.submit();
                            return;
                        }
                        var params = $.extend({}, settings.pagingParams, {
                            current_page: page.attr('value') - 1,
                            callback:     function (inpage) {
                                if (page.attr('value') == inpage + 1) {
                                    return;
                                }
                                page.attr('value', inpage + 1);
                                form.submit();
                            }
                        });
                        settings.paging.pagination(data.countPage, params);
                    }
                }, post, {root: null});
            });
            return function () {
                if (settings.disable_submit == false)
                    form.submit();
            };
        },
        updateRows:     function (columns, target, rows, settings, summary, targetfoot) {
            var tr, td, i, rowind, row, text, cont, thisisfoot = false,
                settings = $.extend({}, defSettings, settings);
            var r = function (column, row, tr) {
                td = document.createElement('td');
                tr.appendChild(td);
                td.className = 'col-' + column.name + ' type-' + column.type;
                text = row[column.name];

                cont = null;
                if (column.type == 'string' || column.type == 'html') {
                    cont = document.createElement('div');
                    cont.className = 'cont';
                    td.appendChild(cont);
                }
                cont = (cont ? cont : td);

                if (column.setter) {
                    text = column.setter.call(row, text, cont, td, tr, summary, thisisfoot);
                    if (typeof text == 'string') {
                        cont.innerHTML = text;
                    }
                } else {
                    switch (column.type) {
                        case 'html':
                            cont.innerHTML = text;
                            return;
                            break;
                        case 'int':
                            text = Number(text);
                            break;
                        case 'bool':
                            var val = !!Number(text);
                            cont.className += ' bool-' + (val ? 'true' : 'false');
                            text = settings.bools[val ? 'btrue' : 'bfalse'];
                            break;
                    }
                    cont.textContent = text;
                }
            };
            for (rowind = 0; rowind < rows.length; rowind++) {
                row = rows[rowind];
                tr = document.createElement('tr');
                for (i = 0; i < columns.length; i++)
                    r(columns[i], row, tr);
                target.appendChild(tr);
            }
            if (thisisfoot = (summary && targetfoot)) {
                tr = document.createElement('tr');
                for (i = 0; i < columns.length; i++)
                    r(columns[i], summary, tr);
                targetfoot.appendChild(tr);
            }
        }
    };

    var classes = {
        Column: function (element, name, sorter) {
            this.element = $(element);
            this.name = name;
            this.title = this.element.text();
            this.sorter = sorter;
            this.isDesc = false;
            this.isSortable = this.element.hasClass('sortable');
            if (this.isSortable) {
                this.obj = $('<button></button>').addClass('flist-sorter');
                this.obj.click(function (that) {
                    return function () {
                        that.sorter.call(that);
                    };
                }(this));
            } else {
                this.obj = $('<span></span>');
            }
            this.obj.
                text(this.title).
                appendTo(this.element.html(''));

            this.type = this.element.data('flist-type') ? this.element.data('flist-type') : 'string';
        },
        Plugin: function (targetTable, settings) {
            this.target = targetTable.addClass('list-filtered');
            this.form = settings.panel.addClass('list-filtered-panel');

            this.updateRows = f.updateRows;

            var tBody = this.target.find('tbody'),
                tHead = this.target.find('thead'),
                tFoot = this.target.find('tfoot');

            // Столбцы
            this.columns = function (list, sorter) {
                var ret = [];
                list.each(function () {
                    var name;
                    if (name = settings.colregex.exp.exec($(this).attr('class'))) {
                        ret.push(
                            new classes.Column(
                                this, name[settings.colregex.index], sorter
                            )
                        );
                    }
                });
                return ret;
            }(this.target.find('thead th'), function (that) {
                    return function () {
                        that.order(this.name, !this.isDesc);
                    };
                }(this));
            this.sorters = function (columns) {
                var ret = $();
                $.each(columns, function () {
                    if (this.isSortable) {
                        ret = ret.add(this.obj);
                    }
                });
                return ret;
            }(this.columns);
            this.col = function (columns) {
                return function (name) {
                    var ret;
                    $.each(columns, function () {
                        if (this.name == name) {
                            ret = this;
                            return false;
                        }
                    });
                    return ret;
                };
            }(this.columns);

            // Фильтры
            this.filters = function (list, update) {
                var ret = $();
                var kdown = function (e) {
                    if (e.keyCode == 13) {
                        update.call(this, e);
                    }
                };
                list.each(function () {
                    switch ($(this).attr('type')) {
                        case 'checkbox':
                            $(this).click(update);
                            return;
                        case 'text':
                            $(this).keydown(kdown);
                            return;
                    }
                    ret.add($(this).change(update));
                });
                return ret;
            }(settings.panel.find('input[name]:not([type="hidden"]), select[name]'), function () {
                $(this).closest('form').submit();
            });

            this.updateEnable = function () {
                settings.disable_submit = false;
            };
            this.update = f.bindFormUpdate(this, settings);

            // Сортировка
            this.order = function (form, sorters, colgetter) {
                var el = $('<input type="hidden" name="order" />').appendTo(form);
                return function (col, isDesc) {
                    this.updateState();
                    var dir = isDesc ? 'desc' : 'asc';
                    el.attr('value', col + ' ' + dir);
                    sorters.removeClass('order-desc').removeClass('order-asc');
                    var col = colgetter(col);
                    col.isDesc = isDesc;
                    col.obj.addClass('order-' + dir);
                    form.submit();
                    return this;
                }
            }(this.form, this.sorters, this.col);

            this.updateState = function (data, summary) {
                tBody.html('');
                tFoot.html('');
                if (typeof data == 'string') {
                    $('<tr>').append(
                        $('<td>').html(data).
                            addClass('message').
                            attr('colspan', this.columns.length)
                    ).appendTo(tBody);
                } else if (typeof data == 'undefined') {
                    $('<tr>').append(
                        $('<td>').html('<img src="' + $webapp.respath + '/flist/preloader.gif" alt="preloader" />').
                            addClass('preloader').
                            attr('colspan', this.columns.length)
                    ).appendTo(tBody);
                } else if (typeof data == 'object' && typeof data.length != 'undefined') {
                    if (data.length) {
                        this.updateRows(this.columns, tBody.get(0), data, {}, summary, tFoot.get(0));
                    } else {
                        this.updateState(settings.noresMessage);
                        if (settings.forceSummary && summary != 'undefined')
                            this.updateRows(this.columns, tBody.get(0), data, {}, summary, tFoot.get(0));
                    }
                } else {
                    this.updateState('Ошибочный статус');
                }
            };

        }
    };

    // Сам плагин
    $.fn[generalClass] = function (options) {
        return this.each(function () {
            var element = $(this);
            if (element.data(generalClass)) {
                return;
            }

            var settings = $.extend({}, defSettings, options || {});
            if (!settings.panel) {
                throw 'Панель не указана';
            }
            element.data(
                generalClass,
                new classes.Plugin(element, settings)
            );
        });
    };
}(jQuery, 'flist');