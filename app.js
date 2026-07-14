/*
============================================================
DEPOSIT SIMULATOR
============================================================

IMPORTANT:
Replace GID only if your Google Sheet tab changes.

Expected Google Sheet columns:

bank
cost_year
cost_opening
cost_closing
commission

interest_3
interest_6
interest_9
interest_12
interest_18
interest_24
interest_30
interest_36
interest_48
interest_60

deposit_min
deposit_max

stamp

link

============================================================
*/

/* ==========================================================
GOOGLE SHEETS SETTINGS
========================================================== */

const SHEET_ID = "1LIR1_l3FAy_RPFQ5wlnRXkMWkHWgYagk";
const GID = "1536666859";

const SHEET_URL =
`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

/* ==========================================================
GRAPH COLORS
========================================================== */

const BANK_COLORS = [
    "#8FD694",
    "#7DBA84",
    "#77AD78",
    "#6F8F72",
    "#504B43"
];

/* ==========================================================
GLOBAL VARIABLES
========================================================== */

let bankData = [];
let chart = null;

/* ==========================================================
CSV PARSER
Handles commas inside quotes:
"2,35%"
========================================================== */

function parseCSV(text){

    const rows = [];

    const lines = text.trim().split("\n");

    const parseLine = function(line){

        const result = [];

        let current = "";

        let insideQuotes = false;

        for(let i=0;i<line.length;i++){

            const char = line[i];

            if(char === '"'){
                insideQuotes = !insideQuotes;
            }
            else if(char === "," && !insideQuotes){
                result.push(current);
                current = "";
            }
            else{
                current += char;
            }
        }

        result.push(current);

        return result;

    };

    const headers =
        parseLine(lines[0]).map(function(h){

            return h.trim();

        });

    for(let i=1;i<lines.length;i++){

        const values =
            parseLine(lines[i]);

        const row = {};

        headers.forEach(function(header,index){

            row[header] =
                values[index]
                ? values[index].replace(/"/g,"").trim()
                : "";

        });

        rows.push(row);

    }

    return rows;

}

/* ==========================================================
LOAD GOOGLE SHEET
========================================================== */

async function loadData(){

    try{

        const response =
            await fetch(SHEET_URL);

        const csv =
            await response.text();

        bankData =
            parseCSV(csv);

        populateBanks();

        updateChart();

    }
    catch(error){

        console.error(error);

    }

}

/* ==========================================================
POPULATE BANK SELECTOR
========================================================== */

function populateBanks(){

    const selector =
        document.getElementById(
            "bankSelector"
        );

    if(!selector){
        return;
    }

    selector.innerHTML = "";

    bankData.forEach(function(bank){

        const option =
            document.createElement(
                "option"
            );

        option.value =
            bank.bank;

        option.textContent =
            bank.bank;

        selector.appendChild(option);

    });

}

/* ==========================================================
STAMP TAX
========================================================== */

function stampRate(value){

    if(
        String(value)
        .toLowerCase()
        .trim() === "client"
    ){
        return 0.002;
    }

    return 0;

}

/* ==========================================================
CONVERT RATE

"2,35%" --> 0.0235
========================================================== */

function getRate(bank,months){

    const field =
        "interest_" + months;

    let value =
        bank[field];

    if(
        value === undefined ||
        value === null ||
        value === ""
    ){
        return 0;
    }

    value =
        value
            .replace("%","")
            .replace(",",".")
            .trim();

    const parsed =
        parseFloat(value);

    if(isNaN(parsed)){
        return 0;
    }

    return parsed / 100;

}

/* ==========================================================
NET INTEREST

Formula agreed:

netInterest =
((amount*rate)*(months/12))
-
(((amount*rate)*(months/12))*0.26)
-
(amount*stamp)
========================================================== */

function netInterest(
    amount,
    rate,
    months,
    stamp
){

    const grossInterest =

        (
            amount *
            rate
        )

        *

        (
            months / 12
        );

    const tax26 =
        grossInterest * 0.26;

    const stampTax =
        amount *
        stampRate(stamp);

    return (

        grossInterest
        -
        tax26
        -
        stampTax

    );

}

/* ==========================================================
ROLLING DEPOSIT CALCULATION

Rules:

- exact term preferred
- longest period available
- lowest number of deposits
- capital(n+1)=capital(n)+netInterest(n)
========================================================== */

function calculateYield(
    bank,
    amount,
    targetMonths
){

    const periods = [

        60,
        48,
        36,
        30,
        24,
        18,
        12,
        9,
        6,
        3

    ];

    let capital =
        amount;

    let remaining =
        targetMonths;

    while(
        remaining > 0
    ){

        let selectedPeriod =
            null;

        for(
            let i=0;
            i<periods.length;
            i++
        ){

            const period =
                periods[i];

            const rate =
                getRate(
                    bank,
                    period
                );

            if(
                rate > 0 &&
                period <= remaining
            ){

                selectedPeriod =
                    period;

                break;

            }

        }

        if(
            selectedPeriod === null
        ){
            return null;
        }

        const selectedRate =
            getRate(
                bank,
                selectedPeriod
            );

        const gain =

            netInterest(
                capital,
                selectedRate,
                selectedPeriod,
                bank.stamp
            );

        capital =
            capital + gain;

        remaining =
            remaining - selectedPeriod;

    }

    return capital - amount;

}

/* ==========================================================
VALIDATE DEPOSIT LIMITS
========================================================== */

function validateAmount(
    bank,
    amount
){

    const min =
        Number(
            bank.deposit_min || 0
        );

    const max =
        Number(
            bank.deposit_max || 999999999
        );

    if(amount < min){

        alert(
            bank.bank +
            " does not allow an amount lower than " +
            min
        );

        return false;

    }

    if(amount > max){

        alert(
            bank.bank +
            " does not allow an amount higher than " +
            max
        );

        return false;

    }

    return true;

}

/* ==========================================================
UPDATE GRAPH
========================================================== */

function updateChart(){

    const amount =

        Number(
            document.getElementById(
                "amount"
            ).value
        );

    const selectedBanks =

        Array
        .from(
            document
            .getElementById(
                "bankSelector"
            )
            .selectedOptions
        )

        .map(function(o){

            return o.value;

        });

    const selectedPeriods =

        Array
        .from(
            document.querySelectorAll(
                ".period-checkbox:checked"
            )
        )

        .map(function(c){

            return Number(
                c.value
            );

        });

    const datasets = [];

    selectedBanks
    .slice(0,5)
    .forEach(function(name,index){

        const bank =

            bankData.find(
                function(b){

                    return b.bank === name;

                }
            );

        if(!bank){
            return;
        }

        if(
            !validateAmount(
                bank,
                amount
            )
        ){
            return;
        }

        const values =
            selectedPeriods.map(
                function(period){

                    return calculateYield(
                        bank,
                        amount,
                        period
                    );

                }
            );

        datasets.push({

            label:name,

            backgroundColor:
                BANK_COLORS[index],

            borderRadius:4,

            data:values

        });

    });

    if(chart){
        chart.destroy();
    }

    chart = new Chart(

        document.getElementById(
            "yieldChart"
        ),

        {

            type:"bar",

            data:{

                labels:

                    selectedPeriods.map(
                        function(period){

                            if(period === 6){
                                return "6 months";
                            }

                            return (
                                period / 12
                            ) + " years";

                        }
                    ),

                datasets:datasets

            },

            options:{

                responsive:true,

                plugins:{

                    tooltip:{

                        callbacks:{

                            label:function(context){

                                if(
                                    context.raw === null
                                ){
                                    return "N/A";
                                }

                                const finalAmount =

                                    amount +
                                    context.raw;

                                return [

                                    "Net yield: €" +
                                    context.raw.toFixed(2),

                                    "Final net amount: €" +
                                    finalAmount.toFixed(2)

                                ];

                            }

                        }

                    }

                },

                scales:{

                    y:{

                        beginAtZero:true,

                        ticks:{

                            callback:function(value){

                                return (
                                    "€" +
                                    value.toLocaleString()
                                );

                            }

                        }

                    }

                }

            }

        }

    );

}

/* ==========================================================
LIVE EVENTS
========================================================== */

document.addEventListener(
    "change",
    function(){
        updateChart();
    }
);

document.addEventListener(
    "input",
    function(){
        updateChart();
    }
);

/* ==========================================================
INITIAL LOAD
========================================================== */

loadData();