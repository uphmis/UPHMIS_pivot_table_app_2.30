import '../extjs/resources/css/ext-all-gray.css';
import './css/style.css';
import './css/meringue.css';
import 'd2-analysis/css/ui/GridHeaders.css';

import arrayTo from 'd2-utilizr/lib/arrayTo';

import { api, table, manager, config, ui, init, override } from 'd2-analysis';

import { Layout } from './api/Layout';

import { LayoutWindow } from './ui/LayoutWindow';
import { OptionsWindow } from './ui/OptionsWindow';
import { DownloadButtonItems } from './ui/DownloadButtonItems';

// override
override.extOverrides();

// extend
api.Layout = Layout;

// references
var refs = {
    api,
    table
};

    // dimension config
var dimensionConfig = new config.DimensionConfig();
refs.dimensionConfig = dimensionConfig;

    // option config
var optionConfig = new config.OptionConfig();
refs.optionConfig = optionConfig;

    // period config
var periodConfig = new config.PeriodConfig();
refs.periodConfig = periodConfig;

    // ui config
var uiConfig = new config.UiConfig();
refs.uiConfig = uiConfig;

    // app manager
var appManager = new manager.AppManager(refs);
appManager.sessionName = 'table';
appManager.apiVersion = 29;
refs.appManager = appManager;

    // calendar manager
var calendarManager = new manager.CalendarManager(refs);
refs.calendarManager = calendarManager;

    // request manager
var requestManager = new manager.RequestManager(refs);
refs.requestManager = requestManager;

    // i18n manager
var i18nManager = new manager.I18nManager(refs);
refs.i18nManager = i18nManager;

    // sessionstorage manager
var sessionStorageManager = new manager.SessionStorageManager(refs);
refs.sessionStorageManager = sessionStorageManager;

    // ui manager
var uiManager = new manager.UiManager(refs);
refs.uiManager = uiManager;

    // instance manager
var instanceManager = new manager.InstanceManager(refs);
instanceManager.apiResource = 'reportTable';
instanceManager.apiEndpoint = 'reportTables';
instanceManager.apiModule = 'dhis-web-pivot';
instanceManager.dataStatisticsEventType = 'REPORT_TABLE_VIEW';
refs.instanceManager = instanceManager;

    // table manager
var tableManager = new manager.TableManager(refs);
refs.tableManager = tableManager;

// dependencies
uiManager.setInstanceManager(instanceManager);
dimensionConfig.setI18nManager(i18nManager);
optionConfig.setI18nManager(i18nManager);
periodConfig.setI18nManager(i18nManager);
uiManager.setI18nManager(i18nManager);

appManager.applyTo([].concat(arrayTo(api), arrayTo(table)));
instanceManager.applyTo(arrayTo(api));
uiManager.applyTo([].concat(arrayTo(api), arrayTo(table)));
dimensionConfig.applyTo(arrayTo(table));
optionConfig.applyTo([].concat(arrayTo(api), arrayTo(table)));

// requests
appManager.init(() => {
    requestManager.add(new api.Request(refs, init.i18nInit(refs)));
    requestManager.add(new api.Request(refs, init.authViewUnapprovedDataInit(refs)));
    requestManager.add(new api.Request(refs, init.isAdminInit(refs)));
    requestManager.add(new api.Request(refs, init.rootNodesInit(refs)));
    requestManager.add(new api.Request(refs, init.organisationUnitLevelsInit(refs)));
    requestManager.add(new api.Request(refs, init.legendSetsInit(refs)));
    requestManager.add(new api.Request(refs, init.dimensionsInit(refs)));
    requestManager.add(new api.Request(refs, init.dataApprovalLevelsInit(refs)));
    requestManager.add(new api.Request(refs, init.userFavoritesInit(refs)));

    requestManager.set(initialize);
    requestManager.run();
});

function initialize() {

    // i18n init
    var i18n = i18nManager.get();

    optionConfig.init();
    dimensionConfig.init();
    periodConfig.init();

    // ui config
    uiConfig.checkout('aggregate');

    // app manager
    appManager.appName = i18n.pivot_tables || 'Pivot Tables';

    // instance manager
    instanceManager.setFn(layout => {

        let tableOptions = { renderLimit: 100000, trueTotals: true }
        let sortingId = layout.sorting ? layout.sorting.id : null;
        let response = layout.getResponse();

        // pre-sort if id
        if (sortingId && sortingId !== 'total') {
            layout.sort();
        }

        let pivotTable = new table.PivotTable(refs, layout, response, tableOptions);

        if (pivotTable.doClipping()) {
            uiManager.confirmRender(
                `Table size warning`,
                () => renderTable(pivotTable, layout, sortingId),
                () =>  {
                    uiManager.update();
                    uiManager.unmask();
                }
            );
        }
        else {
            renderTable(pivotTable, layout, sortingId);
        }
    });

    function renderTable(pivotTable, layout, sortingId) {

        // initialize pivot table values
        pivotTable.initialize();

        // bind mouse events
        let bindMouseHandlers = function() {
            tableManager.setColumnHeaderMouseHandlers(layout, pivotTable);
            tableManager.setValueMouseHandlers(layout, pivotTable);
        }

        // sort if total
        if (sortingId && sortingId === 'total') {

            // sort pivot table based on totals
            layout.sort(pivotTable);

            // reinitialize pivot table values due to sorting
            pivotTable.initialize();
        }

        // set viewport dimensions (used for clipping)
        pivotTable.setViewportSize(
            uiManager.get('centerRegion').getWidth(),
            uiManager.get('centerRegion').getHeight()
        );

        // build table
        pivotTable.build();

        // render
        uiManager.update(pivotTable.render());

        // events
        bindMouseHandlers();

        // mask
        uiManager.unmask();

        // statistics
        instanceManager.postDataStatistics();

        // bind clipping events
        if (pivotTable.doClipping()) {

            uiManager.setScrollFn('centerRegion', ({ target: { scrollTop, scrollLeft } }) => {
                pivotTable.scrollHandler(uiManager.update, scrollTop, scrollLeft, () => {
                    bindMouseHandlers();
                });
            });

            uiManager.setResizeFn('centerRegion', (newWidth, newHeight) => {
                pivotTable.resizeHandler(uiManager.update, newWidth, newHeight, () => {
                    bindMouseHandlers();
                });
            });

        } else {
            uiManager.removeScrollFn('centerRegion');
            uiManager.removeResizeFn('centerRegion');
        }

        uiManager.scrollTo("centerRegion", 0, 0);
    }

    // ui manager
    uiManager.disableRightClick();
    uiManager.enableConfirmUnload();

    // intro
    uiManager.introHtmlIsAsync = true;

    const introHtml = function() {

        var html = '<div class="ns-viewport-text" style="padding:20px">';

        html += '<h3>' + i18nManager.get('example1') + '</h3>' +
            '<div>- ' + i18nManager.get('example2') + '</div>' +
            '<div>- ' + i18nManager.get('example3') + '</div>' +
            '<div>- ' + i18nManager.get('example4') + '</div>' +
            '<h3 style="padding-top:20px">' + i18nManager.get('example5') + '</h3>' +
            '<div>- ' + i18nManager.get('example6') + '</div>' +
            '<div>- ' + i18nManager.get('example7') + '</div>' +
            '<div>- ' + i18nManager.get('example8') + '</div>';

        if (appManager.userFavorites.length > 0) {
            html += '<div id="top-favorites" style="margin-top: 20px; padding: 0">';
            html += `<h3>${ i18nManager.get('example9') }</h3>`;


            appManager.userFavorites.forEach(function(favorite) {
                html += '<div>- <a href="javascript:void(0)" class="favorite favorite-li" id="favorite-' + favorite.id + '">' + favorite.name + '</a></div>';
            });

            html += '</div>';
        }

        return html;
    }

    uiManager.setIntroHtml(introHtml());

    uiManager.setUpdateIntroHtmlFn(function() {
        return new api.Request(refs, init.userFavoritesInit(refs)).run()
            .then(() => uiManager.setIntroHtml(introHtml()));
    });

    // windows
    uiManager.reg(LayoutWindow(refs), 'layoutWindow').hide();

    uiManager.reg(OptionsWindow(refs), 'optionsWindow').hide();

    uiManager.reg(ui.FavoriteWindow(refs), 'favoriteWindow').hide();

    // viewport
    const northRegion = uiManager.reg(ui.NorthRegion(refs), 'northRegion');

    const eastRegion = uiManager.reg(ui.EastRegion(refs), 'eastRegion');

    const westRegionItems = uiManager.reg(ui.WestRegionAggregateItems(refs), 'accordion');

    var defaultIntegrationButton = uiManager.reg(ui.IntegrationButton(refs, {
        isDefaultButton: true,
        btnText: i18n.table,
        btnIconCls: 'ns-button-icon-table'
    }), 'defaultIntegrationButton');

    const chartIntegrationButton = ui.IntegrationButton(refs, {
        objectName: 'chart',
        moduleName: 'dhis-web-visualizer',
        btnIconCls: 'ns-button-icon-chart',
        btnText: i18n.chart,
        menuItem1Text: i18n.go_to_charts,
        menuItem2Text: i18n.open_this_table_as_chart,
        menuItem3Text: i18n.open_last_chart
    });

    // viewport
    uiManager.reg(ui.Viewport(refs, {
        northRegion: northRegion,
        eastRegion: eastRegion,
        westRegionItems: westRegionItems,
        integrationButtons: [
            defaultIntegrationButton,
            chartIntegrationButton,
        ],
        DownloadButtonItems: DownloadButtonItems
    }, {
        getLayoutWindow: function() {
            return uiManager.get('layoutWindow');
        },
        getOptionsWindow: function() {
            return uiManager.get('optionsWindow');
        },
    }), 'viewport');

    // subscribe functions to viewport regions to update ui on renew
    uiManager.subscribe('centerRegion', () => {
        if (appManager.userFavorites.length) {
            appManager.userFavorites.forEach(function(favorite) {
                Ext.get('favorite-' + favorite.id).addListener('click', function() {
                    instanceManager.getById(favorite.id, null, true);
                });
            });
        }
    });
}

global.refs = refs;
