import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as fromAppStore from '../../app-store/app.reducer';
import * as UserActions from './user.actions';
import { clearBusinessState } from '../../core/business/business-store/business.actions';
import { clearLocationState } from 'src/app/core/business/location/location-store/location.actions';

import { of } from 'rxjs';
import {
  catchError,
  concatMap,
  exhaustMap,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';

import { environment } from 'src/environments/environment';

import { UserService } from '../user-control/user.service';

import { User } from '../user-control/user.model';
import { Location } from '../../core/business/business-control/location.model';

import { MatDialog } from '@angular/material/dialog';

const BACKEND_URL = environment.apiUrl + '/user';

const handleError = (errorRes: HttpErrorResponse) => {
  let errorMessage = errorRes.error.message;

  if (!errorRes.error.message) {
    console.log(errorRes);
    errorMessage =
      'Error: ' +
      errorRes.status +
      ' ' +
      errorRes.statusText +
      'An unknown error has occurred.';
    return of(UserActions.authFail({ errorMessage }));
  }

  return of(UserActions.authFail({ errorMessage }));
};

@Injectable()
export class UserEffects {
  signupStart$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.signupStart),
      switchMap((action) => {
        return this.http
          .post<{ email: string; password: string }>(BACKEND_URL + '/signup', {
            userId: action.newUser.userId,
            email: action.newUser.email,
            password: action.newUser.password,
            userProfile: {
              role: action.newUser.userProfile.role,
              department: action.newUser.userProfile.department,
              firstName: action.newUser.userProfile.firstName,
              lastName: action.newUser.userProfile.lastName,
              phoneNumber: action.newUser.userProfile.phoneNumber,
              themePref: action.newUser.userProfile.themePref,
            },
          })
          .pipe(
            map((resData) => {
              return UserActions.loginStart({
                email: action.newUser.email,
                password: action.newUser.password,
              });
            }),
            catchError((errorRes) => {
              console.log(errorRes);
              return handleError(errorRes);
            })
          );
      })
    )
  );

  loginStart$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.loginStart),
      switchMap((action) => {
        return this.http
          .post<{
            token: string;
            expiresIn: number;
            user: User;
            userId: string;
          }>(BACKEND_URL + '/login', {
            email: action.email,
            password: action.password,
          })
          .pipe(
            map((resData) => {
              if (resData.token) {
                console.log(resData.expiresIn);
                this.userService.setLogoutTimer(resData.expiresIn * 1000);

                const now = new Date();
                const expirationDate = new Date(
                  now.getTime() + resData.expiresIn * 1000
                );

                const userAuthData = {
                  token: resData.token,
                  expiration: expirationDate.toISOString(),
                  userId: resData.userId,
                };

                const userProfileData = {
                  userId: resData.userId,
                  email: resData.user.email,
                  userProfile: resData.user.userProfile,
                };

                localStorage.removeItem('guestUserData');
                localStorage.setItem(
                  'userAuthData',
                  JSON.stringify(userAuthData)
                );
                localStorage.setItem(
                  'userProfileData',
                  JSON.stringify(userProfileData)
                );
                this.dialog.closeAll();
                this.router.navigate(['/app/dashboard']);
              }
              return UserActions.authSuccess({
                user: {
                  _id: resData.userId,
                  userId: resData.userId,
                  email: resData.user.email,
                  password: resData.token,
                  userProfile: resData.user.userProfile,
                },
              });
            }),
            catchError((errorRes) => {
              console.log(errorRes);
              return handleError(errorRes);
            })
          );
      })
    )
  );

  updateUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.PUTUpdateUserSuccess),
      map((action) => {
        console.warn('||| updateUser$ effect called |||===');
        console.log(action);

        const userProfileData = {
          _id: action.user.userId,
          userId: action.user._id,
          email: action.user.email,
          userProfile: action.user.userProfile,
        };

        localStorage.setItem(
          'userProfileData',
          JSON.stringify(userProfileData)
        );

        // return UserActions.autoLogin();
        return { type: 'dummy data' };
      })
    )
  );

  fetchUserLocations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.GETUserLocationsStart),
      concatMap((action) => {
        console.log('||| userId: ===>>>' + action.userId);
        return this.http
          .get<{ fetchedLocations: Location[] }>(
            BACKEND_URL +
              '/fetch-user-locations/' +
              action.userId +
              '/' +
              action.userRole
          )
          .pipe(
            map((resData) => {
              console.log(resData);
              let returnedLocations: Location[] = resData.fetchedLocations;
              if (resData && resData.fetchedLocations) {
                const locations = resData.fetchedLocations;
                localStorage.setItem('locations', JSON.stringify(locations));

                return UserActions.GETUserLocationsSuccess({
                  locations: returnedLocations,
                });
              }
            })
          );
      }),
      catchError((errorRes) => {
        console.log(errorRes);
        return handleError(errorRes);
      })
    )
  );

  autoLogin$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.autoLogin),
      map(() => {
        // PULL AUTHDATA FROM LOCAL STORAGE
        const userAuthData: {
          token: string;
          expiration: string;
          userId: string;
        } = JSON.parse(localStorage.getItem('userAuthData'));
        if (!userAuthData) {
          console.log('||| Log in to continue |||');
          return { type: 'No user logged in.' };
        }

        // PULL PROFILE DATA FROM LOCAL STORAGE
        const userProfileData: {
          userId: string | null;
          email: string;
          password: string;
          userProfile: {
            role: number;
            department: string;
            firstName: string;
            lastName: string;
            phoneNumber: string;
            themePref: string | null;
            userPhoto: string | null;
          };
        } = JSON.parse(localStorage.getItem('userProfileData'));

        const locations = JSON.parse(localStorage.getItem('locations'));

        const authorizedUser = {
          token: userAuthData.token,
          expiration: new Date(userAuthData.expiration),
          userId: userAuthData.userId,
        };

        const userProfile = {
          userId: userProfileData.userId,
          email: userProfileData.email,
          userProfile: userProfileData.userProfile,
        };

        if (authorizedUser.userId) {
          const now = new Date().getTime();
          const expirationDuration = authorizedUser.expiration.getTime() - now;
          this.userService.setLogoutTimer(expirationDuration);
          return UserActions.authSuccess({
            user: {
              _id: userAuthData.userId,
              userId: userAuthData.userId,
              email: userProfile.email,
              password: userAuthData.token,
              userProfile: userProfile.userProfile,
            },
          });
        } else {
          console.log('User ID is: ' + authorizedUser.userId);
          return UserActions.authFail({
            errorMessage: 'Not authenticated! Log in.',
          });
        }
      })
    )
  );

  authLogout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(UserActions.logout),
        tap(() => {
          this.userService.clearLogoutTimer();
          localStorage.clear();
          this.store.dispatch(clearBusinessState());
          this.store.dispatch(clearLocationState());
          const guestUserData = { themePref: 'theme-dark' };
          localStorage.setItem('guestUserData', JSON.stringify(guestUserData));
          this.router.navigate(['/']);
          console.clear();
          console.log('||| USER WAS LOGGED OUT |||');
        })
      ),
    { dispatch: false }
  );

  constructor(
    private dialog: MatDialog,
    private actions$: Actions,
    private http: HttpClient,
    private router: Router,
    private userService: UserService,
    private store: Store<fromAppStore.AppState>
  ) {}
}
