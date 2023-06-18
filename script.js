'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAll = document.querySelector('.deleteAll');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  marking = "";
  constructor() {
    // Get user's position

    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // Add adit and delete events to element 
    this.#workouts.forEach(work => {
      this._addEventListenerToDelete(work);
      this._AddeventListenerToEdit(work);
    });

    // Delete all workout from local storage 
    deleteAll.addEventListener('click', function () {
      const response = confirm('Are you sure you want delete all workouts ?')
      if (response) {
        window.localStorage.clear();
        location.reload();        
      }else{
        // stay on page 
      }
    });
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position, try again !');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling Clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '' ;

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    const validInputs = (...inputs) =>
    inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    
    e.preventDefault();
    
    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    
    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
      return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
      return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();
    
    // Add event Listener To Delete
    this._addEventListenerToDelete(workout);
    
    // Add event Listener To Edit
    this._AddeventListenerToEdit(workout);

    // Set local storage to all workouts
    this._setLocalStorage();
  }
  
  _AddeventListenerToEdit(work) {
    document.querySelectorAll('.workout').forEach((wrk, i) => {
      if (wrk.dataset.id == work.id) {
        let event = '';
        wrk.childNodes.forEach(cls => cls.className == 'edit' ? event = cls : '' );

        event.addEventListener('click', function () {
          form.classList.remove('hidden');
          inputType.value = work.type;
          inputDistance.value = work.distance;
          inputDuration.value = work.duration;
          if (work.type === 'cycling') {
            document.querySelector('.form__input--type').value = 'cycling';
            document.querySelector(
              '.form__input--elevation'
            ).value = `${work.elevationGain}`;

            document.querySelectorAll('.form__row').forEach(
              elm => {
                if (elm.childNodes[1].textContent == 'Elev Gain')
                  elm.classList.remove('form__row--hidden');
                if (elm.childNodes[1].textContent == 'Cadence') {
                  elm.classList.add('form__row--hidden');
                }
              }
            );

            document.querySelector('.form__input--cadence').value = ``;
          } else {
            document.querySelector('.form__input--type').value = 'running';
            document.querySelector(
              '.form__input--cadence'
            ).value = `${work.cadence}`;

            document.querySelectorAll('.form__row').forEach(
              elm => {
                if (elm.childNodes[1].textContent == 'Elev Gain')
                  elm.classList.add('form__row--hidden');
                if (elm.childNodes[1].textContent == 'Cadence') {
                  elm.classList.remove('form__row--hidden');
                }
              }
            );
            document.querySelector('.form__input--elevation').value = ``;
          }
          app._deleteWorkout(work);
        });
      }
    });
  }
  _addEventListenerToDelete(work) {
    document.querySelectorAll('.workout').forEach((wrk, i) => {

      if (wrk.dataset.id == work.id) {
        let event = '';
        wrk.childNodes.forEach(cls =>
          cls.className == 'delete' ? event = cls  : '' );
        event.addEventListener('click', function () {

          wrk.remove();          

          app.#map.removeLayer(work.marking);

          app.#workouts = app.#workouts.filter(data => data.id != work.id);

          app._setLocalStorage();
        });
      }
    });
  }

  _deleteWorkout(work) {
    document.querySelectorAll('.workout').forEach(w => {
      if (w.dataset.id == work.id) {
        w.remove();
         app.#map.removeLayer(work.marking);
        app.#workouts = app.#workouts.filter(data => data.id != w.dataset.id);
        app._setLocalStorage();
      }
    });
  }
  _renderWorkoutMarker(workout) {
    // Display Marker
    const marker =  L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
      workout.marking = marker
   }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id=${workout.id}>
    <h5 class="errorMsg"></h5>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
      <span class="edit">edit</span>
      <span class="delete">delete</span>  
      </li>
`;
    }
    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details" >
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
      <span class="edit">edit</span>
      <span class="delete">delete</span>
  
  </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    // BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    if (workout != null) {
      this.#map.setView(workout.coords, 13, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    }
  }

  _getCircularReplacer = () => {
    const handle = new WeakSet();
    return (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (handle.has(value)) {
          return;
        }
        handle.add(value);
      }
      return value;
    };
  };

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts, this._getCircularReplacer()));  
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

}

const app = new App();

