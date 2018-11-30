let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
const initMap = () => {
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 12,
    scrollWheelZoom: false
  });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoibGlzYWtvc3MiLCJhIjoiY2ptcGNqb3FoMWR4eTNwcGRja3YxdW9jeiJ9.tqARyWdvATWCwlXgmS8kLg',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.srcset = DBHelper.imageSrcSetUrlForRestaurant(restaurant, 'tiles');
  image.alt = `${restaurant.name} promotional image`;
  li.append(image);

  const textArea = document.createElement('div');
  textArea.classList.add('text-area');

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  name.tabIndex = '0';
  name.setAttribute('id', `${restaurant.name.replace(/\s/g, "")}`);
  textArea.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  textArea.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  textArea.append(address);

  // On click transfers the user to the respective restaurant page.
  function redirectFunc() {
    window.location.href = DBHelper.urlForRestaurant(restaurant);
  }

  const detailsBtn = document.createElement('button');
  detailsBtn.classList.add('details-button');
  detailsBtn.onclick = redirectFunc;
  detailsBtn.innerHTML = 'View Details';

  textArea.append(detailsBtn);

  let isFavorite = false;
  if (restaurant['is_favorite'] && restaurant['is_favorite'].toString() === 'true') {
    isFavorite = true;
  }

  const favoriteBtnDiv = document.createElement('div');
  const favoriteBtn = document.createElement('button');
  favoriteBtn.classList.add(`favorite-button`);
  const favoriteIcon = document.createElement('i'); // font awesome icon
  favoriteBtn.id = `favorite-${restaurant.id}`;
  let labelFavorite;
  if(!isFavorite) {
    labelFavorite = 'Favorite';
  } else {
    labelFavorite = 'Unfavorite'
  }
  favoriteBtn.setAttribute('aria-label', `${labelFavorite}`);
  favoriteBtn.setAttribute('aria-labelledby', `${restaurant.name.replace(/\s/g, "")}`)
  favoriteIcon.id = `favorite-icon-${restaurant.id}`;

  if (isFavorite) { // a favorite; filled heart
    favoriteIcon.classList.add('fas');
  } else { // not a favorite; unfilled heart
    favoriteIcon.classList.add('far');
  }

  favoriteIcon.classList.add('fa-heart');
  favoriteBtn.onclick = function () {
    toggleFavorite(restaurant.id, !isFavorite);
  }

  favoriteBtn.append(favoriteIcon);
  favoriteBtnDiv.append(favoriteBtn);
  textArea.append(favoriteBtnDiv);
  li.append(textArea);

  return li;
}

/**
 * Toggle favorite on individual restaurants.
 */

const toggleFavorite = (restaurantId, isFavorite) => {
  const favoriteBtn = document.getElementById(`favorite-${restaurantId}`);
  favoriteBtn.onclick = null;
  favoriteBtn.onclick = event => toggleFavorite(restaurantId, !isFavorite);

  DBHelper.handleFavorite(restaurantId, isFavorite);
}

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on('click', onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

}
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */

