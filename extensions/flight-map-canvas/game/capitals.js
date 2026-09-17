/**************************************************************
 * World Capitals organized by continent/region.              *
 * Each capital includes country, city name, and coordinates. *
 *************************************************************/
var CAPITALS_BY_REGION = [
    {
        region: "North America",
        capitals: [
            { country: "United States", capital: "Washington, D.C.", lat: 38.8951, lng: -77.0364 },
            { country: "Canada", capital: "Ottawa", lat: 45.4215, lng: -75.6972 },
            { country: "Mexico", capital: "Mexico City", lat: 19.4326, lng: -99.1332 },
            { country: "Cuba", capital: "Havana", lat: 23.1136, lng: -82.3666 },
            { country: "Guatemala", capital: "Guatemala City", lat: 14.6349, lng: -90.5069 },
            { country: "Costa Rica", capital: "San Jose", lat: 9.9281, lng: -84.0907 },
            { country: "Panama", capital: "Panama City", lat: 8.9824, lng: -79.5199 },
            { country: "Jamaica", capital: "Kingston", lat: 18.0179, lng: -76.8099 }
        ]
    },
    {
        region: "South America",
        capitals: [
            { country: "Brazil", capital: "Brasilia", lat: -15.7975, lng: -47.8919 },
            { country: "Argentina", capital: "Buenos Aires", lat: -34.6037, lng: -58.3816 },
            { country: "Chile", capital: "Santiago", lat: -33.4489, lng: -70.6693 },
            { country: "Colombia", capital: "Bogota", lat: 4.7110, lng: -74.0721 },
            { country: "Peru", capital: "Lima", lat: -12.0464, lng: -77.0428 },
            { country: "Venezuela", capital: "Caracas", lat: 10.4806, lng: -66.9036 },
            { country: "Ecuador", capital: "Quito", lat: -0.1807, lng: -78.4678 },
            { country: "Uruguay", capital: "Montevideo", lat: -34.9011, lng: -56.1645 }
        ]
    },
    {
        region: "Europe",
        capitals: [
            { country: "United Kingdom", capital: "London", lat: 51.5074, lng: -0.1278 },
            { country: "France", capital: "Paris", lat: 48.8566, lng: 2.3522 },
            { country: "Germany", capital: "Berlin", lat: 52.5200, lng: 13.4050 },
            { country: "Italy", capital: "Rome", lat: 41.9028, lng: 12.4964 },
            { country: "Spain", capital: "Madrid", lat: 40.4168, lng: -3.7038 },
            { country: "Russia", capital: "Moscow", lat: 55.7558, lng: 37.6173 },
            { country: "Netherlands", capital: "Amsterdam", lat: 52.3676, lng: 4.9041 },
            { country: "Greece", capital: "Athens", lat: 37.9838, lng: 23.7275 },
            { country: "Sweden", capital: "Stockholm", lat: 59.3293, lng: 18.0686 },
            { country: "Norway", capital: "Oslo", lat: 59.9139, lng: 10.7522 },
            { country: "Portugal", capital: "Lisbon", lat: 38.7223, lng: -9.1393 },
            { country: "Czech Republic", capital: "Prague", lat: 50.0755, lng: 14.4378 },
            { country: "Austria", capital: "Vienna", lat: 48.2082, lng: 16.3738 },
            { country: "Switzerland", capital: "Bern", lat: 46.9480, lng: 7.4474 },
            { country: "Poland", capital: "Warsaw", lat: 52.2297, lng: 21.0122 },
            { country: "Turkey", capital: "Ankara", lat: 39.9334, lng: 32.8597 }
        ]
    },
    {
        region: "Asia",
        capitals: [
            { country: "Japan", capital: "Tokyo", lat: 35.6762, lng: 139.6503 },
            { country: "China", capital: "Beijing", lat: 39.9042, lng: 116.4074 },
            { country: "India", capital: "New Delhi", lat: 28.6139, lng: 77.2090 },
            { country: "South Korea", capital: "Seoul", lat: 37.5665, lng: 126.9780 },
            { country: "Thailand", capital: "Bangkok", lat: 13.7563, lng: 100.5018 },
            { country: "Vietnam", capital: "Hanoi", lat: 21.0285, lng: 105.8542 },
            { country: "Indonesia", capital: "Jakarta", lat: -6.2088, lng: 106.8456 },
            { country: "Philippines", capital: "Manila", lat: 14.5995, lng: 120.9842 },
            { country: "Singapore", capital: "Singapore", lat: 1.3521, lng: 103.8198 },
            { country: "Malaysia", capital: "Kuala Lumpur", lat: 3.1390, lng: 101.6869 },
            { country: "Pakistan", capital: "Islamabad", lat: 33.6844, lng: 73.0479 },
            { country: "Israel", capital: "Jerusalem", lat: 31.7683, lng: 35.2137 },
            { country: "UAE", capital: "Abu Dhabi", lat: 24.4539, lng: 54.3773 },
            { country: "Saudi Arabia", capital: "Riyadh", lat: 24.7136, lng: 46.6753 }
        ]
    },
    {
        region: "Africa",
        capitals: [
            { country: "Egypt", capital: "Cairo", lat: 30.0444, lng: 31.2357 },
            { country: "South Africa", capital: "Pretoria", lat: -25.7479, lng: 28.2293 },
            { country: "Kenya", capital: "Nairobi", lat: -1.2921, lng: 36.8219 },
            { country: "Nigeria", capital: "Abuja", lat: 9.0579, lng: 7.4951 },
            { country: "Morocco", capital: "Rabat", lat: 34.0209, lng: -6.8416 },
            { country: "Ethiopia", capital: "Addis Ababa", lat: 9.0250, lng: 38.7469 },
            { country: "Tanzania", capital: "Dodoma", lat: -6.1630, lng: 35.7516 },
            { country: "Ghana", capital: "Accra", lat: 5.6037, lng: -0.1870 }
        ]
    },
    {
        region: "Oceania",
        capitals: [
            { country: "Australia", capital: "Canberra", lat: -35.2809, lng: 149.1300 },
            { country: "New Zealand", capital: "Wellington", lat: -41.2865, lng: 174.7762 },
            { country: "Fiji", capital: "Suva", lat: -18.1416, lng: 178.4419 },
            { country: "Papua New Guinea", capital: "Port Moresby", lat: -6.3149, lng: 143.9556 }
        ]
    }
];
