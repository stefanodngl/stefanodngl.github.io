const CSV_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTbo6T11RGrSySTB1SIUQo1P944lSOqHMNJHVG98PLV7XmNEweXabN8oQA_H_Miqw/pub?gid=1536666859&single=true&output=csv";
const COLORS = [
    "#8FD694",
    "#7DBA84",
    "#77AD78",
    "#6F8F72",
    "#504B43"
];

let bankData = [];
let chart = null;

function parseCSV(text) {

    const rows = [];

    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];

        if (char === '"') {

            inQuotes = !inQuotes;

        }
        else if (char === ',' && !inQuotes) {

            row.push(field);
            field = "";

        }
        else if (
            (char === '\n' || char === '\r')
            &&
            !inQuotes
        ) {

            if (row.length > 0 || field.length > 0) {

                row.push(field);

                rows.push(row);

                row = [];
                field = "";

            }

        }
        else {

            field += char;

        }

    }

    if (row.length > 0 || field.length > 0) {

        row.push(field);

        rows.push(row);

    }

    const headers =
        rows[0].map(
            h => h.trim()
        );

    return rows
        .slice(1)
        .map(values => {

            const obj = {};

            headers.forEach((header,index)=>{

                obj[header] =
                    values[index]
                    ? values[index].trim()
                    : "";

            });

            return obj;

        });

}

async function loadData() {

    try {

        const response =
            await fetch(CSV_URL);

        const csv =
            await response.text();

        bankData =
            parseCSV(csv);
console.log(bankData[0]);
console.log(bankData[1]);
        
        populateBanks();

        updateChart();

    }
    catch(error) {

        console.error(error);
    }
}

function populateBanks() {

    const selector =
        document.getElementById(
            "bankSelector"
        );

    selector.innerHTML = "";

    bankData.forEach(bank => {

        if (!bank.bank) return;

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

function getRate(bank, months) {

    const field =
        "interest_" + months;

    let value =
        bank[field];

    if (!value) {
        return 0;
    }

    value =
        String(value)
        .replace("%", "")
        .replace(",", ".")
        .replace(/"/g, "")
        .trim();

    const rate =
        parseFloat(value);

    return isNaN(rate)
        ? 0
        : rate / 100;
}


function paysStamp(bank) {

    return String(
        bank.stamp_tax || ""
    )
    .trim()
    .toLowerCase() === "client";

}


function calculateYield(
    bank,
    amount,
    targetMonths
) {

    const rate =
        getRate(
            bank,
            targetMonths
        );

    if (rate <= 0) {
        return null;
    }

    const years =
        targetMonths / 12;

    const grossInterest =
        amount *
        rate *
        years;

    const capitalTax =
        grossInterest * 0.26;

    let stampTax = 0;

    if (
        paysStamp(bank)
    ) {

        stampTax =
            amount *
            0.002 *
            years;

    }

    return (
        grossInterest - capitalTax - stampTax
    );

}

function updateChart() {

    const amount =
        Number(
            document
            .getElementById(
                "amount"
            )
            .value || 50000
        );

    const periods = [
        6,
        12,
        24,
        36,
        48,
        60
    ];

    const selectedBanks =

        Array
            .from(
                document
                .getElementById(
                    "bankSelector"
                )
                .selectedOptions
            )

            .map(
                x => x.value
            );

    document
        .getElementById(
            "selectedBanks"
        )
        .innerHTML =

        selectedBanks
            .map(

                bank =>

                `<span class="chip">${bank}</span>`

            )
            .join("");

    const datasets = [];

    selectedBanks
        .slice(0,5)
        .forEach(

        (bankName,index) => {

            const bank =

                bankData.find(

                    b =>
                    b.bank === bankName

                );

            if(!bank){
                return;
            }

            const data =

                periods.map(
                    p =>
                    calculateYield(
                        bank,
                        amount,
                        p
                    )
                );

            datasets.push({

                label:
                    bankName,

                backgroundColor:
                    COLORS[index],

                data:
                    data

            });

        });

    if(chart){

        chart.destroy();

    }

    chart =

        new Chart(

            document.getElementById(
                "yieldChart"
            ),

            {

                type:"bar",

                data:{

                    labels:[

                        "6m",
                        "1y",
                        "2y",
                        "3y",
                        "4y",
                        "5y"

                    ],

                    datasets

                },

                options:{

                    responsive:true,

                    maintainAspectRatio:false

                }

            }

        );

}

document
.getElementById("amount")
.addEventListener(
    "input",
    updateChart
);

document
.getElementById("bankSearch")
.addEventListener(
    "input",
    function(){

        const search =
            this.value.toLowerCase();

        const options =
            document
            .getElementById(
                "bankSelector"
            )
            .options;

        for(let i=0;i<options.length;i++){

            options[i].hidden =
                !options[i]
                .text
                .toLowerCase()
                .includes(search);

        }

    }
);

document.addEventListener(
    "change",
    updateChart
);

loadData();