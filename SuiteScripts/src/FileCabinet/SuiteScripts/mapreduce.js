/**
 *  @NApiVersion 2.x
 *  @NScriptType  MapReduceScript
 *  @NModuleScope SameAccount
 *
 *  PURPOSE
 *  Sum yesterday’s Sales Orders by customer and upsert
 *  customrecorddaily_cust_sales
 *     • custrecord_dcs_customer (List/Record ► Customer)
 *     • custrecord_dcs_total    (Currency)
 */
define(['N/search', 'N/record', 'N/log', 'N/format'],
function (search, record, log, format) {

/* ───────────────────── 1. INPUT ───────────────────── */
function getInputData () {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    var y = format.format({value:d, type:format.Type.DATE});   // “MM/DD/YYYY”

    log.debug('getInputData', 'SO on ' + y);

    return search.create({
        type   : 'salesorder',
        filters: [
            ['trandate','onorafter', y],'and',
            ['trandate','onorbefore',y],'and',
            ['mainline','is','T']
        ],
        columns:['entity','total']
    });
}

/* ───────────────────── 2. MAP  (per SO) ───────────── */
function map (ctx) {
    var row   = JSON.parse(ctx.value);
    var cust  = row.values.entity.value || 'NA';
    var total = +row.values.total || 0;

    log.debug('map','SO ' + row.id + '  cust=' + cust + '  amt=' + total);
    ctx.write({key:cust, value:total});
}

/* ───────────────────── 3. REDUCE (per customer) ───── */
function reduce (ctx) {
    var cust  = ctx.key;
    var sum   = ctx.values.map(Number).reduce(function(a,b){return a+b;}, 0);

    log.debug('reduce','cust=' + cust + '  total=' + sum);

    /* upsert: search first */
    var searchRes = search.create({
        type:'customrecorddaily_cust_sales',
        filters:[['custrecord_dcs_customer','anyof',cust]],
        columns:['internalid']
    }).run().getRange({start:0,end:1});

    if (searchRes.length){
        record.submitFields({
            type   :'customrecorddaily_cust_sales',
            id     : searchRes[0].id,
            values : {custrecord_dcs_total:sum}
        });
    } else {
        var rec = record.create({type:'customrecord_daily_cust_sales'});
        rec.setValue({fieldId:'custrecord_dcs_customer', value:cust});
        rec.setValue({fieldId:'custrecord_dcs_total',    value:sum});
        rec.save();
    }

    ctx.write(cust, sum); // for summarize
}

/* ───────────────────── 4. SUMMARIZE ───────────────── */
function summarize (s) {
    try {
        log.audit('Summary','Usage=' + s.usage +
                           '  Concurrency=' + s.concurrency +
                           '  Yields=' + s.yields);

        /* output iterator may be empty; loop safely */
        if (s.output) {
            s.output.iterator().each(function(k,v){
                log.debug('Final total', 'cust=' + k + '  total=' + v);
                return true;
            });
        }

        function dumpErrors(label, bucket){
            if (bucket && bucket.iterator){
                bucket.iterator().each(function(k,e){
                    log.error(label + ' ' + k, e);
                    return true;
                });
            }
        }
        dumpErrors('InputErr',  s.inputSummary  && s.inputSummary.errors);
        dumpErrors('MapErr',    s.mapSummary    && s.mapSummary.errors);
        dumpErrors('ReduceErr', s.reduceSummary && s.reduceSummary.errors);

    } catch (e){
        log.error('FATAL summarize', e.name + ': ' + e.message + '\n' + e.stack);
        throw e;                        // mark run as Failed
    }
}

return {getInputData:getInputData, map:map, reduce:reduce, summarize:summarize};
});

