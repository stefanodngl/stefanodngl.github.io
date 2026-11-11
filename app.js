const CSV_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTbo6T11RGrSySTB1SIUQo1P944lSOqHMNJHVG98PLV7XmNEweXabN8oQA_H_Miqw/pub?gid=1536666859&single=true&output=csv";
const COLORS = [ // bars color
    "#A682FF",
    "#715AFF",
    "#5887FF",
    "#55C1FF",
    "#03254E"
];

Chart.defaults.font.family =
    "Segoe UI";

Chart.defaults.font.size =
    13;

Chart.defaults.color =
    "#555555";

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
            &
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
                    values[index] ? values[index].trim()
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

    return isNaN(rate) ? 0: rate / 100;
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

function validateDepositAmount(
    bank,
    amount
){

    const min =
        bank.deposit_min &&
        bank.deposit_min !== "" ? Number(bank.deposit_min)
        : 0;

    const max =
        bank.deposit_max &&
        bank.deposit_max !== "" ? Number(bank.deposit_max)
        : Infinity;

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

function updateChart() {

    const amount =
        Number(
            document
            .getElementById(
                "amount"
            )
            .value || 0
        );

    const periods = [
        6,
        12,
        24,
        36,
        48,
        60
    ];

    const selectedPeriods =

        Array
        .from(

            document.querySelectorAll(
                ".period-checkbox.active-period"
            )

        )

        .map(

            button =>
            Number(
                button.value
            )

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

            if(
                !validateDepositAmount(
                    bank,
                    amount
                )
            ){

                datasets.push({

                    label:
                        bankName,

                    data:
                        periods.map(
                            () => 0
                        ),

                    backgroundColor:
                        "rgba(255,255,255,0)",

                    borderColor:
                        COLORS[index],

                });

                return;
            }

            const data =

                periods.map(function(p){

                    if(
                        !selectedPeriods.includes(p)
                    ){
                        return null;
                    }

                    return calculateYield(
                        bank,
                        amount,
                        p
                    );

                });

            datasets.push({

                label:
                    bankName,

                data:
                    data,

                backgroundColor:
                    COLORS[index], // change bars border
                borderColor: "#c6c6c6ba",
                borderWidth: 1.1,
                borderRadius: 8,
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

                    labels:

                        periods.map(function(period){

                            if(period === 6){
                                return "6 months";
                            }

                            return (
                                period / 12
                            ) + " year" + (period > 12 ? "s" : "");
                        }),

                    datasets

                },

                options:{
                    responsive:true,
                    maintainAspectRatio:false,

                    plugins:{
                        tooltip:{
                            backgroundColor:"rgba(0, 0, 0, 0.75)",
                            titleColor:"#ffffff",
                            bodyColor:"#eaeaea",
                            borderColor:"#d1d5db",
                            borderWidth:1,

                            callbacks:{

                                label:function(context){

                                    return "Net yield: €" +

                                    Number(context.raw).toLocaleString(
                                        "en-US",
                                        {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        }
                                    );

                                }

                            }

                        },
    
                        legend:{
                                    position:"bottom"
                            }//,
                            // title:{
                            //    display:true,
                            //    text:"Net Yield Comparison"
                            //}
                    },

                    scales:{
                            y:{
                                beginAtZero:true,
                                grid:{
                                    color:"#e9e9e973"
                                },
                                ticks: {
                                    callback: function(value) {
                                        return "€" +
                                            Number(value).toLocaleString(
                                                "en-US",
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }
                                            );
                                    }
                                }
                            },
                            x:{
                                grid:{
                                    display:false
                                }
                            }
                    }
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
    function(event){

        if(
            event.target.id !==
            "bankSelector"
        ){

            updateChart();

        }

    }
);

document
.getElementById("bankSelector")
.addEventListener(
    "change",
    function(){

        const selected =

            Array.from(
                this.selectedOptions
            );

        if(selected.length > 5){

            selected[
                selected.length - 1
            ].selected = false;

            alert(
                "You can select a maximum of 5 banks."
            );

        }

        updateChart();

    }
);

document.addEventListener(
    "DOMContentLoaded",
    function(){

        document
        .querySelectorAll(
            ".period-checkbox"
        )
        .forEach(function(button){

            button.addEventListener(
                "click",
                function(){

                    this.classList.toggle(
                        "active-period"
                    );

                    updateChart();

                }
            );

        });

    }
);

loadData();