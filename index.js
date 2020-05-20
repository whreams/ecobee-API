
var apiKey = 'kJpT6YVgPFy10TEFHVlurG8zAncnhx4f';
var authCode = null;
var accessToken = '';
var refreshToken = '';
var latestToken = '';
var path = 'tokensource.json';
var fs = require('fs');
var request = require('request')
var actualTemperature = '';



/*
 * NEW INSTALLS STARTS HERE.  REQUEST PIN CODE FOR APP ACCESS @ ECOBEE.COM . EXECUTION RETURNS
 * ACCESS CODE NEEDED FOR ONGOING CALLS. 
 */
 function pinRequest() {
  var request = require('request');
  var options = {
    url: "https://api.ecobee.com/authorize?response_type=ecobeePin&client_id=" + apiKey + "&scope=smartWrite",
    method: 'GET'
  };

  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log(body);
        setTimeout(accessTokenRequest, 20000);
        var response = JSON.parse(body);
        authCode = (JSON.stringify(response.code));
    };
  };
  request(options, callback);
};



/*
 * INITIAL REQUEST FOR ACCESS AND REFRESH TOKENS TO THE APP.  SUCCESSFUL RESPONSE WRITES TO
 * THE "TOKENSOURCE.JSON" FILE.  FILE IS TO BE READ ONGOING FOR REFRESH
 * TOKEN ACCESS
 */
function accessTokenRequest(){
  var subString = 'https://api.ecobee.com/token?grant_type=ecobeePin&code='+authCode+'&client_id=kJpT6YVgPFy10TEFHVlurG8zAncnhx4f';
  var postString =(subString.replace(/['"]+/g, ''));
  
  
  request.post(postString, 
    (error, response, body) => {
      if (response.statusCode !=200) {
        console.log(body);
        setTimeout(accessTokenRequest,20000)
      } else {
      console.log("Authorized");
      console.log(body);
      var response = JSON.parse(body);
      accessToken =  (JSON.stringify(response.access_token)); 
      
      try {
        fs.unlinkSync(path)
        //file removed
      } catch(err) {
        console.error(err)
      }

      fs.appendFileSync('tokensource.json', body, 'utf8', function (err) {
        if (err) throw err;
        console.log('Saved!');
      });

      let tokensource = fs.readFileSync('tokensource.json');
      getStatus();

    }; //* END POST STRING
  }); //* END REQUEST CALL
}; //* END FUNCTION



/*
 * REQUEST FOR REFRESHING TOKENS FOR A KNOWN REGISTERED CLIENT ONCE ORIGINAL TOKEN  
 * HAS EXPIRED (> 60MINS).  THE "TOKENSOURCE.JSON" FILE.  FILE IS TO BE READ ONGOING FOR REFRESH
 * TOKEN ACCESS.  
 */
function newToken(){
  let tokensource = fs.readFileSync('tokensource.json');
  var refreshToken = JSON.parse(tokensource);
  var options = {
    url: "https://api.ecobee.com/token?grant_type=refresh_token&refresh_token="+ refreshToken.refresh_token + "&client_id=kJpT6YVgPFy10TEFHVlurG8zAncnhx4f",
    method: 'POST'
  };


  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log("New Token Authorized");
      var response = JSON.parse(body);
      accessToken =  (JSON.stringify(response.access_token)); 
    
      var path = 'tokensource.json';

      try {
        fs.unlinkSync(path)
        //file removed
      } catch(err) {
        console.error(err)
      }

      fs.appendFileSync('tokensource.json', body, 'utf8', function (err) {
        if (err) throw err;
        console.log('Saved!');
      });

      let tokensource = fs.readFileSync('tokensource.json');
      setTimeout(getStatus,3000);

    };
  };
  request(options, callback);
};



/*
 * THERMOSTAT STATUS CALL USING STORED ACCESS TOKEN FROM FILE
 */
function getStatus(){
  let tokensource = fs.readFileSync('tokensource.json');
  var latestToken = JSON.parse(tokensource);
  var headers = {
    'Content-Type': 'text/json',  
    'Authorization': 'Bearer '+latestToken.access_token   /* SENSITIVE SYNTAX!  WATCH THIS LINE */
  };
  var options = {
      url: 'https://api.ecobee.com/1/thermostat?format=json&body=\{"selection":\{"selectionType":"registered","selectionMatch":"","includeRuntime":true\}\}',
      headers: headers
  };
  

  function callback(error, response, body) {


      if (!error && response.statusCode == 200) {
          // console.log(body);
          var response = JSON.parse(body);
          
          actualTemperature = (response.thermostatList[0].runtime.actualTemperature);
          console.log('Current Temp: ' + actualTemperature); 
      } else {
      console.log(body)
      console.log('Requesting New Token');
      setTimeout(newToken, 5000);
      }
  }
  request(options, callback);
  
  
};




// setInterval(myMethod, 30000);
// function myMethod( )
// {
  getStatus();
// }




  

// Example Thermostat Plugin

module.exports = (api) => {
api.registerAccessory('ExampleThermostatPlugin', ExampleThermostatAccessory);
};

class ExampleThermostatAccessory {

  constructor(log, config, api) {
      this.log = log;
      this.config = config;
      this.api = api;

      this.Service = this.api.hap.Service;
      this.Characteristic = this.api.hap.Characteristic;

      // extract name from config
      this.name = config.name;

      // create a new Thermostat service
      this.service = new this.Service(this.Service.Thermostat);

      // create handlers for required characteristics
      this.service.getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
        .on('get', this.handleCurrentHeatingCoolingStateGet.bind(this));

      this.service.getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
        .on('get', this.handleTargetHeatingCoolingStateGet.bind(this))
        .on('set', this.handleTargetHeatingCoolingStateSet.bind(this));

      this.service.getCharacteristic(this.Characteristic.CurrentTemperature)
        .on('get', this.handleCurrentTemperatureGet.bind(this));

      this.service.getCharacteristic(this.Characteristic.TargetTemperature)
        .on('get', this.handleTargetTemperatureGet.bind(this))
        .on('set', this.handleTargetTemperatureSet.bind(this));

      this.service.getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
        .on('get', this.handleTemperatureDisplayUnitsGet.bind(this))
        .on('set', this.handleTemperatureDisplayUnitsSet.bind(this));

  }


  // /**
  //  * Handle requests to get the current value of the "Current Heating Cooling State" characteristic
  //  */
  handleCurrentHeatingCoolingStateGet(callback) {
    this.log.debug('Triggered GET CurrentHeatingCoolingState');

    // set this to a valid value for CurrentHeatingCoolingState
    const currentValue = 1;

    callback(null, currentValue);
  }


  // /**
  //  * Handle requests to get the current value of the "Target Heating Cooling State" characteristic
  //  */
  handleTargetHeatingCoolingStateGet(callback) {
    this.log.debug('Triggered GET TargetHeatingCoolingState');

    // set this to a valid value for TargetHeatingCoolingState
    const currentValue = 1;

    callback(null, currentValue);
  }

  // /**
  //  * Handle requests to set the "Target Heating Cooling State" characteristic
  //  */
  // handleTargetHeatingCoolingStateSet(value, callback) {
  //   this.log.debug('Triggered SET TargetHeatingCoolingState:' value);

  //   callback(null);
  // }

  // /**
  //  * Handle requests to get the current value of the "Current Temperature" characteristic
  //  */
  handleCurrentTemperatureGet(callback) {
    this.log.debug('Triggered GET CurrentTemperature');

    // set this to a valid value for CurrentTemperature
    const currentValue = actualTemperature;

    callback(null, currentValue);
  }


  // /**
  //  * Handle requests to get the current value of the "Target Temperature" characteristic
  //  */
  handleTargetTemperatureGet(callback) {
    this.log.debug('Triggered GET TargetTemperature');

    // set this to a valid value for TargetTemperature
    const currentValue = 1;

    callback(null, currentValue);
  }

  // /**
  //  * Handle requests to set the "Target Temperature" characteristic
  //  */
  // handleTargetTemperatureSet(value, callback) {
  //   this.log.debug('Triggered SET TargetTemperature:' value);

  //   callback(null);
  // }

  // /**
  //  * Handle requests to get the current value of the "Temperature Display Units" characteristic
  //  */
  handleTemperatureDisplayUnitsGet(callback) {
    this.log.debug('Triggered GET TemperatureDisplayUnits');

    // set this to a valid value for TemperatureDisplayUnits
    const currentValue = 1;

    callback(null, currentValue);
  }

  // /**
  //  * Handle requests to set the "Temperature Display Units" characteristic
  //  */
  // handleTemperatureDisplayUnitsSet(value, callback) {
  //   this.log.debug('Triggered SET TemperatureDisplayUnits:' value);

  //   callback(null);
  // }
}