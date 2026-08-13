const initialMode = "OFFLINE";

const dadRadarModes = {
  HOME: {
    status: "HOME",
    message: "DADDY IS HOME",
    locationAirport: "AVL",
    flight: null
  },

  LOCATION_UNKNOWN: {
    status: "LOCATION UNKNOWN",
    message:
      "DADDY'S LOCATION IS NOT CONFIRMED",
    flight: null
  },

  COMMUTING_TO_BASE: {
    status: "COMMUTING TO BASE",
    flight: {
      number: "AA 5421",
      origin: "AVL",
      destination: "ORD",
      destinationCity: "CHICAGO",
      airspeed: 430,
      heading: 330,
      altitude: 32000,
      progress: 48,
      eta: "10:18 AM"
    }
  },

  DELAYED: {
    status: "DELAYED",
    flight: {
      number: "AA 1234",
      origin: "ORD",
      destination: "AVL",
      destinationCity: "ASHEVILLE",
      airspeed: 0,
      heading: 0,
      altitude: 0,
      progress: 0,
      eta: "DELAYED"
    }
  },

  BOARDING: {
    status: "BOARDING",
    flight: {
      number: "AA 1234",
      origin: "ORD",
      destination: "AVL",
      destinationCity: "ASHEVILLE",
      airspeed: 0,
      heading: 0,
      altitude: 0,
      progress: 0,
      eta: "7:42 PM"
    }
  },

  TAXI_OUT: {
    status: "TAXI OUT",
    flight: {
      number: "AA 1234",
      origin: "ORD",
      destination: "AVL",
      destinationCity: "ASHEVILLE",
      airspeed: 12,
      heading: 270,
      altitude: 680,
      progress: 0,
      eta: "7:42 PM"
    }
  },

  EN_ROUTE: {
    status: "EN ROUTE",
    flight: {
      number: "AA 1234",
      origin: "ORD",
      destination: "AVL",
      destinationCity: "ASHEVILLE",
      airspeed: 438,
      heading: 171,
      altitude: 34000,
      progress: 62,
      eta: "7:42 PM"
    }
  },

  APPROACH: {
    status: "APPROACH",
    flight: {
      number: "AA 1234",
      origin: "ORD",
      destination: "AVL",
      destinationCity: "ASHEVILLE",
      airspeed: 210,
      heading: 171,
      altitude: 8500,
      progress: 92,
      eta: "7:42 PM"
    }
  },

  DIVERTED: {
    status: "DIVERTED",
    flight: {
      number: "AA 1234",
      origin: "ORD",
      destination: "TYS",
      destinationCity: "KNOXVILLE",
      airspeed: 280,
      heading: 220,
      altitude: 12000,
      progress: 78,
      eta: "8:18 PM"
    }
  },

  ARRIVED: {
    status: "ARRIVED",
    flight: {
      number: "AA 1234",
      origin: "ORD",
      destination: "AVL",
      destinationCity: "ASHEVILLE",
      airspeed: 0,
      heading: 0,
      altitude: 2165,
      progress: 100,
      eta: "ARRIVED"
    }
  },

  LAYOVER: {
    status: "LAYOVER",
    message: "ON LAYOVER",
    locationAirport: "ORD",
    flight: null
  },

  COMMUTING_HOME: {
    status: "COMMUTING HOME",
    flight: {
      number: "AA 1234",
      origin: "ORD",
      destination: "AVL",
      destinationCity: "ASHEVILLE",
      airspeed: 438,
      heading: 171,
      altitude: 34000,
      progress: 62,
      eta: "7:42 PM"
    }
  },

  OFFLINE: {
    status: "OFFLINE",
    message: "FLIGHT DATA UNAVAILABLE",
    flight: null
  }
};
