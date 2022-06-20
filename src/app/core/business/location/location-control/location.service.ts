import { Injectable, OnInit } from '@angular/core';

import { Subscription } from 'rxjs';

import { Store } from '@ngrx/store';
import * as fromAppStore from '../../../../app-store/app.reducer';
import * as LocationActions from '../location-store/location.actions';
import * as BusinessActions from '../../business-store/business.actions';

import { Location } from '../../business-control/location.model';
import { LocationIds } from '../../business-control/business.model';
import { LocationState } from '../location-store/location.reducer';
import { BusinessState } from '../../business-store/business.reducer';
import { Product } from '../../business-control/product.model';
import { Inventory } from '../../business-control/inventory.model';

@Injectable({
  providedIn: 'root',
})
export class LocationService implements OnInit {
  constructor(private _store: Store<fromAppStore.AppState>) {}

  private _businessStoreSub: Subscription;
  private _locationStoreSub: Subscription;

  businessState: BusinessState;
  locationState: LocationState;

  ngOnInit() {
    this._locationStoreSub = this._store
      .select('location')
      .subscribe((locState) => {
        console.log(locState);
        this.locationState = locState;
      });

    this._businessStoreSub = this._store
      .select('business')
      .subscribe((bizState) => {
        console.log(bizState);
        this.businessState = bizState;
      });
  }

  activateLocation(activatedLocation: Location) {
    console.log(activatedLocation);
    console.log(this.locationState);
    if (!activatedLocation) {
      return;
    }

    localStorage.setItem(
      'activatedLocation',
      JSON.stringify(activatedLocation)
    );
    return this._store.dispatch(
      LocationActions.ActivateLocation({
        location: activatedLocation,
      })
    );
  }

  getLocations(userId: string, userStringRole: string, userNumberRole: number) {
    const userLocations: Location[] = JSON.parse(
      localStorage.getItem('userLocations')
    );

    const businessLocations: Location[] = JSON.parse(
      localStorage.getItem('businessLocations')
    );

    if (userStringRole === 'owner') {
      const storedBusiness: {
        business: {
          _id: string | null;
          businessName: string;
          ownerId: string;
          locations: Location[] | LocationIds[] | [] | null;
        };
      } = JSON.parse(localStorage.getItem('storedBusiness'));

      if (businessLocations) {
        console.log(businessLocations);
        console.log('||| locations fetched from local storage |||');
        this._store.dispatch(
          BusinessActions.GETBusinessLocationsSuccess({
            locations: businessLocations,
          })
        ),
          this._store.dispatch(
            LocationActions.GETUserLocationsSuccess({
              locations: businessLocations,
            })
          );
      } else if (!businessLocations) {
        console.log('||| getting locations from DB |||');
        console.log(storedBusiness);
        this._store.dispatch(
          BusinessActions.GETBusinessLocationsStart({
            businessId: storedBusiness.business._id,
          })
        );
      } else {
        this._store.dispatch(
          BusinessActions.BusinessError({ errorMessage: 'No locations found.' })
        );
      }
    } else if (userStringRole !== 'owner') {
      if (userLocations) {
        console.log(userLocations);
        console.log('||| userLocations fetched from local storage |||');
        this._store.dispatch(
          LocationActions.GETUserLocationsSuccess({
            locations: userLocations,
          })
        );
      } else if (!userLocations) {
        console.log('||| getting userLocations from DB |||');
        console.log(userId);
        this._store.dispatch(
          LocationActions.GETUserLocationsStart({
            userId: userId,
            userRole: userNumberRole,
          })
        );
      } else {
        this._store.dispatch(
          LocationActions.LocationError({
            errorMessage: 'No user locations found.',
          })
        );
      }
    }
  }

  getActivatedLocation() {
    const activatedLocation: Location = JSON.parse(
      localStorage.getItem('activatedLocation')
    );

    if (activatedLocation) {
      console.warn(
        '||| Found active location: ' + activatedLocation.locationName + ' |||'
      );
      console.log(activatedLocation);
      return this._store.dispatch(
        LocationActions.ActivateLocation({
          location: activatedLocation,
        })
      );
    } else {
      console.log('||| No active location found. |||');
    }
  }

  selectProducts(
    checked: boolean,
    activeProducts: Product[],
    product: Product
  ) {
    // EMPTY TYPED ARRAY FOR THE FILTER
    let updatedSelection: Product[] = [];

    // CHECK IF SELECTED PRODUCT IS ALREADY IN selectedProducts
    let productExists = activeProducts.find(
      (arrProduct) => arrProduct === product
    );

    // IF ADDING PRODUCTS AND PRODUCT IS NOT ALREADY ADDED
    // ADD TO THE LIST
    if (checked === true && !productExists) {
      activeProducts.push(product);
    }
    // IF REMOVING PRODUCTS AND PRODUCT IS IN THE LIST
    // FILTER OUT THAT PRODUCT
    if (checked === false && productExists) {
      updatedSelection = activeProducts.filter(
        (arrProduct) => arrProduct !== product
      );
      // UPDATE THE LIST
      activeProducts = [...updatedSelection];
    }
    // SEND THE LIST TO THE STORE
    this._store.dispatch(
      LocationActions.ActivateProducts({
        products: [...activeProducts],
      })
    );
  }

  // GET AND STORE A POPULATED LIST OF THIS LOCATION'S INVENTORIES
  getPopulatedInventories(
    initLocInventories: boolean,
    inventoryData: Inventory[],
    activeLocationId: string
  ) {
    // CHECK LOCALSTORAGE FOR ALREADY FETCHED INVENTORIES
    const storedInv = JSON.parse(localStorage.getItem('inventoryData'));

    if (storedInv) {
      // CHECK TO SEE IF ANY DRAFTS ARE IN THE INVs
      let draft: Inventory = null;
      for (const inv of storedInv) {
        if (!inv.isFinal) {
          draft = inv;
        }
      }
      // SEND INV DATA AND ANY DRAFTS FOUND TO THE STORE
      this._store.dispatch(
        LocationActions.GETLocationInventoriesSuccess({
          inventoryData: storedInv,
          draft: draft,
        })
      );
    // IF NONE FOUND IN LOCALSTORAGE, FETCH THE POPULATED INVENTORIES
    } else if (
      !storedInv &&
      initLocInventories &&
      inventoryData &&
      inventoryData.length > 0
    ) {
      this._store.dispatch(
        LocationActions.GETLocationInventoriesStart({
          locationId: activeLocationId,
        })
      );
    }
  }




}
