
function isUndefined(obj) {
  return typeof obj === 'undefined';
}

        /**
 * Class to get data from a google Spreadsheet document. 
 */


function loadXMLDoc(url, callBackFunction, thisArg) {
  var xmlhttp;

  if (window.XMLHttpRequest) {
    // code for IE7+, Firefox, Chrome, Opera, Safari
    xmlhttp = new XMLHttpRequest();
  } else {
    // code for IE6, IE5
    xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  }
  xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState == XMLHttpRequest.DONE) {
        if (xmlhttp.status == 200) {
          // If called from a class you need to send the this arguments with it
          // to keep the scope. 
          if(!isUndefined(thisArg)){
            callBackFunction.apply(thisArg, [xmlhttp]);
          }else{
            callBackFunction(xmlhttp);
          }
        } else if (xmlhttp.status == 400) {
          //alert('There was an error 400');
        } else {
          //alert('status:' + xmlhttp.status);
        }
      }
    }
    /* 
        Insert Google spreadsheet here
    */

  xmlhttp.open("GET", url, true);
  xmlhttp.send();
}


class googleSpreadsheetApi {
    /**
     * Initializes a new class with the data source. For development when text is still changed. Remember to to click File -> publish to web. 
     * @param {String, Object} dataSource - This contains the datasoruce of the spreadsheet. If in development, query the google spreadsheet api with an url fx "//spreadsheets.google.com/feeds/list/1ELDjdbmpZAQJX9Pm_vZ1UKJfDPnjwoBtIvbpDV0EZnc/1/public/values?alt=json". If in prod. Save the json respones locally, require it through webpack and call this class with that json variable. 
     */
    constructor(dataSource) {
        this.dataSource = dataSource;
    }


    /**
     * Function that gets the text from the spreadsheet into an object. 
     */
    getTextInJson(callbackFunction) {
        this.callbackFunction = callbackFunction;
        // If the datasource is a string, query the api for the data
        if (typeof this.dataSource == "string") {
            // Send in this with the xml, this ensures keeping the correct this scope
            loadXMLDoc(this.dataSource, this.handleGoogleSpreadsheetAjaxCall, this);
        } else if (typeof this.dataSource == "object") {
             // If the datasource is an object the data has been saved and imported through weback, then just process the json
            this.handleGoogleSpreadsheetAjaxCall(this.dataSource);
        }
    }

    handleGoogleSpreadsheetAjaxCall(response) {
        let responseObj;
        // Check if response is in the response object. If it is, the text has been loaded from google spreadsheets. If not we have simply required it. 
        if ('response' in response) {
            responseObj = JSON.parse(response.response);
        } else {
            responseObj = response;
        }

        const sheetEntries = responseObj.feed.entry;

        this.callbackFunction(sheetEntries);
    }
}


const googleSpreadsheetApiObject = new googleSpreadsheetApi("https://spreadsheets.google.com/feeds/list/1m6Q_c7aDcldqzZD6U0Vw6OnfMViROu04W6OCFztVEFY/1/public/values?alt=json");
googleSpreadsheetApiObject.getTextInJson(handleRequest);
let donors;

function handleRequest(sheetEntries) {
    // Simply counting the lengths of the sheetEntries. If 1 i know it is title and description, if not it is the pois   
    if (!(sheetEntries.length == 1 || sheetEntries.length == 0)) {
        let sheetEntriesMapped = sheetEntries.map((entry) => {
            let objectToReturn = {};
            // Look throught all keys that contain gsx$, which contains the data a user has input. Insert this data into a array of objects
            Object.keys(entry).forEach((key) => {
                if (key.indexOf("gsx$") >= 0) {
                    objectToReturn[key.replace('gsx$', '')] = entry[key]['$t'];
                }
            });
            return objectToReturn;
        });
        donors = sheetEntriesMapped;
    }
}
/*
document.querySelector('select').addEventListener(() => {
    sheetEntriesMapped.filter((donor) => {
        console.log(donor);
    });
});
*/

document.addEventListener("DOMContentLoaded", function() {
    var input = document.querySelector('.area input');
    var content = document.querySelector('section.content');
    var ul = document.querySelector('section.content ul');
    var modal = document.querySelector('aside .modal');
    var modalName = document.querySelector('aside .modal span.name');
    const aside = document.querySelector('aside');
    var modalContact = document.querySelector('aside .modal span.contact');

    var options = {
        types: ['(cities)'],
        componentRestrictions: {country: "dk"},
    };
    var autocomplete = new google.maps.places.Autocomplete(input, options);

    let lat;
    let lng;
    autocomplete.addListener('place_changed', function() {
        var place = autocomplete.getPlace();
        lat = place.geometry.location.lat();
        lng = place.geometry.location.lng();
    });


    var findDonors = document.querySelector('.filter > .area > button').addEventListener('click', (event) => {
        const fermentationStarter = document.querySelector('.fermentation-starter input:checked').value.toLowerCase();
        
        let matchingDonors = donors.filter((donor) => {
            return donor.fermentering1.toLowerCase() === fermentationStarter || donor.fermentering2.toLowerCase() === fermentationStarter || donor.fermentering3.toLowerCase() === fermentationStarter ||donor.fermentering4.toLowerCase() === fermentationStarter;
        });

        if (lat) {
            matchingDonors = matchingDonors.filter((donor) => {
                return parseInt(getDistanceFromLatLonInKm(lat,lng, donor.lat, donor.lng)) < 100;
            });
        }

        if (matchingDonors.length !== 0) {
            content.classList.add("visible");
            ul.innerHTML = '';
            const li = document.createElement("li");
            li.innerHTML = `
                    <ul>
                        <li class="name">Navn</li>
                        <li class="city">By</li>
                        <li class="matching-ferment">Starterkultur</li>
                        <li class="contact">Kontakt</li>
                    </ul>
                `
            ul.appendChild(li);

            matchingDonors.forEach((matchingDonor) => {
                const li = document.createElement("li");
                li.innerHTML = `
                    <ul>
                        <li class="name">${matchingDonor.navn}</li>
                        <li class="city">${matchingDonor.by}</li>
                        <li class="matching-ferment">${matchingDonor.fermentering1}</li>
                        <li class="contact"><button data-name="${matchingDonor.navn}" data-contact="${matchingDonor.kontaktinfo}">Kontakt</button></li>
                    </ul>
                `
                ul.appendChild(li);
            });

            document.querySelector('section.content ul li ul li.contact button').addEventListener('click', (event) => {
                aside.classList.add("visible");
                const clickedContact = event.target;

                modalName.innerHTML = clickedContact.getAttribute('data-name');
                modalContact.innerHTML = clickedContact.getAttribute('data-contact');

                modal.style.display = 'block';
            });
        } else {
            content.classList.add("visible");
            ul.innerHTML = '';
            const li = document.createElement("li");
            li.innerHTML = `
                    Ingen resultater fundet.
                `
            ul.appendChild(li);
        }
    });

    document.querySelector('aside .modal > button:first-of-type').addEventListener('click', (event) => {
        aside.classList.remove("visible");
    });

    document.querySelector('aside .modal > button:last-of-type').addEventListener('click', (event) => {
        aside.classList.remove("visible");
    });
});

function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}


