import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as fromAppStore from '../../app-store/app.reducer';
import * as UserActions from './user.actions';
import * as NotificationsActions from '../../notifications/notifications-store/notifications.actions';
import { clearBusinessState } from '../../inventory-app/navigation/business/business-store/business.actions';
import { clearLocationState } from 'src/app/inventory-app/navigation/business/location/location-store/location.actions';

import { of } from 'rxjs';
import {
  catchError,
  concatMap,
  exhaustMap,
  map,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';

import { environment } from 'src/environments/environment';

import { UserService } from '../user-control/user.service';

import { User } from '../user.model';
import { Location } from '../../inventory-app/models/location.model';

import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

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
    this._actions$.pipe(
      ofType(UserActions.signupStart),
      exhaustMap((action) => {
        console.warn('||| signupStart$ effect called |||');
        return this._http
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
            map(() => {
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

  deleteUserStart$ = createEffect(() =>
    this._actions$.pipe(
      ofType(UserActions.DELETEUserStart),
      exhaustMap((action) => {
        console.warn('||| deleteUserStart$ effect called |||');
        return this._http
          .delete(BACKEND_URL + '/user/' + action.userId)
          .pipe(
            map((res) => {
              console.log(res);
              console.warn('||| ^^^ deleteUserStart$ resData ^^^ |||');

              this._store.dispatch(UserActions.logout());
              this._dialog.closeAll();

              return UserActions.DELETEUserSuccess();
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
    this._actions$.pipe(
      ofType(UserActions.loginStart),
      switchMap((action) => {
        console.warn('||| loginStart$ effect called |||');
        return this._http
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
                console.warn('||| ^^^ loginStart$ resData ^^^ |||');
                this._userService.setLogoutTimer(resData.expiresIn * 1000);

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
                this._dialog.closeAll();
                this._router.navigate(['/app/dashboard']);
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

  resetPassInit$ = createEffect(() =>
    this._actions$.pipe(
      ofType(UserActions.passwordResetInit),
      take(1),
      exhaustMap((action) => {
        console.warn('||| resetPassInit$ effect called |||');
        return this._http
          .post<{ message: string }>(BACKEND_URL + '/reset', {
            email: action.email,
          })
          .pipe(
            map((resData) => {
              console.log(resData);
              console.warn('||| resetPassInit$ resData |||');

              this._store.dispatch(
                UserActions.setUserMessage({ message: resData.message })
              );

              this._store.dispatch(
                NotificationsActions.showMessage({
                  message: resData.message,
                  notificationAction: 'dismiss',
                  duration: 10000,
                })
              );

              return UserActions.passwordResetInitSuccess({
                message: resData.message,
              });
            }),
            catchError((errorRes) => {
              console.log(errorRes);
              return of(
                UserActions.userError({ message: errorRes.error.message })
              );
            })
          );
      })
    )
  );

  checkTokenValidity$ = createEffect(() =>
    this._actions$.pipe(
      ofType(UserActions.checkTokenValidity),
      take(1),
      exhaustMap((action) => {
        console.warn('||| checkTokenValidity$ effect called |||');
        return this._http
          .get<{ userId?: string; message?: string }>(
            BACKEND_URL + '/reset/' + action.token
          )
          .pipe(
            map((resData) => {
              console.log(resData);
              console.warn('||| ^^^ checkTokenValidity$ resData ^^^ |||');

              if (resData.userId) {
                this._userService.setPassResetUserId(resData.userId);
              } else if (resData.message) {
                return UserActions.setUserMessage({ message: resData.message });
              }

              return { type: 'Action Dispatched' };
            }),
            catchError((errorRes) => {
              console.log(errorRes);
              return of(
                UserActions.userError({ message: errorRes.error.message })
              );
            })
          );
      })
    )
  );

  saveNewPassword$ = createEffect(() =>
    this._actions$.pipe(
      ofType(UserActions.saveNewPassword),
      exhaustMap((action) => {
        console.warn('||| saveNewPassword$ effect called |||');
        return this._http
          .put<{ message: string }>(BACKEND_URL + '/reset', {
            newPass: action.newPass,
            userId: action.userId,
            token: action.token,
          })
          .pipe(
            map((resData) => {
              console.log(resData);
              console.warn('||| ^^^ saveNewPassword$ resData ^^^ |||');

              // this._snackbar.dismiss();

              this._store.dispatch(
                NotificationsActions.showMessage({
                  message: resData.message,
                  notificationAction: 'dismiss',
                  duration: 10000,
                })
              );

              return UserActions.setUserMessage({ message: resData.message });
            })
          );
      })
    )
  );

  updateUser$ = createEffect(() =>
    this._actions$.pipe(
      ofType(UserActions.PUTUpdateUserSuccess),
      map((action) => {
        console.warn('||| updateUser$ effect called |||');

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
        return UserActions.autoLogin();
      })
    )
  );

  fetchUserLocations$ = createEffect(() =>
    this._actions$.pipe(
      ofType(UserActions.GETUserLocationsStart),
      concatMap((action) => {
        return this._http
          .get<{ fetchedLocations: Location[] }>(
            BACKEND_URL +
              '/user-locations/' +
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
    this._actions$.pipe(
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
          this._userService.setLogoutTimer(expirationDuration);
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
      this._actions$.pipe(
        ofType(UserActions.logout),
        tap(() => {
          this._userService.clearLogoutTimer();
          localStorage.clear();
          this._store.dispatch(clearBusinessState());
          this._store.dispatch(clearLocationState());
          const guestUserData = { themePref: 'theme-dark' };
          localStorage.setItem('guestUserData', JSON.stringify(guestUserData));
          this._router.navigate(['/']);
          console.clear();
          console.log('||| USER WAS LOGGED OUT |||');
        })
      ),
    { dispatch: false }
  );

  constructor(
    private _dialog: MatDialog,
    private _snackbar: MatSnackBar,
    private _actions$: Actions,
    private _http: HttpClient,
    private _router: Router,
    private _userService: UserService,
    private _store: Store<fromAppStore.AppState>
  ) {}
}
