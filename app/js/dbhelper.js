import idb from 'idb';

/**
 * Common database helper functions.
 */

class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback, id) {
    let fetchUrl;


    if (!id) { // all restaurants
      fetchUrl = DBHelper.DATABASE_URL;
    } else { // by restaurant id
      fetchUrl = `${DBHelper.DATABASE_URL}/${id}`;
    }

    fetch(fetchUrl)
      .then(function (response) {
        return response.json();
      })
      .then(function (restaurants) {
        callback(null, restaurants);
      })
      .catch(function (error) {
        let errorStatement = (`Request failed. Returned ${error}`);
        callback(errorStatement, null);
      })

    /*let xhr = new XMLHttpRequest();w
    xhr.open('GET', DBHelper.DATABASE_URL);
    xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
        const json = JSON.parse(xhr.responseText);
        const restaurants = json.restaurants;
        callback(null, restaurants);
      } else { // Oops!. Got an error from server.
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    };
    xhr.send();*/
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        //const restaurant = restaurants.find(r => r.id == id);
        const restaurant = restaurants;
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    }, id);
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  static handleFavorite(restaurantId, isFavorite) {
    DBHelper.updateFavorite(restaurantId, isFavorite, (error, result) => {
      if (error) {
        console.log("Error updating favorite.");
        return;
      }

      const favoriteBtn = document.getElementById(`favorite-icon-${result.restaurantId}`);

      if (result.isFavorite) {
        favoriteBtn.classList.add("fas");
        favoriteBtn.classList.remove("far");
      } else {
        favoriteBtn.classList.add("far");
        favoriteBtn.classList.remove("fas");
      }
    })
  }

  static updateFavorite(restaurantId, isFavorite, callback) {
    DBHelper.updateRestaurantData(restaurantId, { "is_favorite": isFavorite });
    callback(null, { restaurantId, isFavorite });
  }

  static handleReview(restaurantId, name, rating, comments, callback) {
    const body = {
      "restaurant_id": restaurantId,
      "name": name,
      "rating": rating,
      "comments": comments
    }

    DBHelper.saveReview(restaurantId, body, (error, result) => {
      if (error) {
        callback(error, null);
        return;
      }
      callback(null, result);
    })
  }

  static saveReview(restaurantId, updateObj, callback) {
    DBHelper.updateReviewData(restaurantId, updateObj);
    callback(null, null);
  }

  static updateReviewData(id, updateObj) {
    let dbPromise = idb.open('mws-restaurant');
    dbPromise.then(function (db) {
      let tx = db.transaction('reviews', 'readwrite');
      let reviewsStore = tx.objectStore('reviews');
      reviewsStore.put({
        'restaurant_id': id,
        data: updateObj,
      });

      return tx.complete;
    })
  }

  static updateRestaurantData(id, updateObj) {
    let dbPromise = idb.open('mws-restaurant');

    // update all restaurant data
    dbPromise.then(function (db) {
      let tx = db.transaction('restaurants', 'readwrite');
      let restaurantsStore = tx.objectStore('restaurants');

      restaurantsStore.get(-1).then(function (value) {
        // no cache
        if (!value) {
          console.log("No cached data retrieved");
          return;
        }

        const restaurantData = value.data[id - 1];
        if (!restaurantData) {
          console.log("No restaurant data retrieved");
          return;
        }

        let updateKeys = Object.keys(updateObj);
        for (let key in updateKeys) {
          let updateAttribute = updateKeys[key];
          console.log('update""', updateAttribute)
          console.log("restDAta", restaurantData[updateAttribute]);
          console.log("updateObj", updateObj[updateAttribute])
          restaurantData[updateAttribute] = updateObj[updateAttribute];
        }

        dbPromise.then(function (db) {
          console.log("value.data", value.data)
          restaurantsStore.put({ id: -1, data: value.data });
          return tx.complete;
        })
      })
    })

    // update specific restaurant data
    dbPromise.then(function (db) {
      let tx = db.transaction('restaurants', 'readwrite');
      let restaurantsStore = tx.objectStore('restaurants');

      restaurantsStore.get(id.toString()).then(function (value) {
        // no cache
        if (!value) {
          console.log("No cached data retrieved");
          return;
        }

        const restaurantData = value.data;
        if (!restaurantData) {
          console.log("No restaurant data retrieved");
          return;
        }

        let updateKeys = Object.keys(updateObj);
        for (let key in updateKeys) {
          let updateAttribute = updateKeys[key];
          restaurantData[updateAttribute] = updateObj[updateAttribute];
        }

        dbPromise.then(function (db) {
          restaurantsStore.put({ id: id.toString(), data: value.data });
          return tx.complete;
        })
      })
    })
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Restaurant image srcset URLs.
   */
  static imageSrcSetUrlForRestaurant(restaurant, directory) {
    let image = restaurant.photograph;

    return (`/img/${directory}/${image}_2x.jpg 2x, /img/${directory}/${image}_1x.jpg 1x`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      })
    marker.addTo(newMap);
    return marker;
  }
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

window.DBHelper = DBHelper;
