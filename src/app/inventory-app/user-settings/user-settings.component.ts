import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import * as fromAppStore from '../../app-store/app.reducer';

import { User } from 'src/app/users/user.model';

import { environment } from 'src/environments/environment';
import { ThemeService } from 'src/app/theme/theme.service';
import { UserService } from 'src/app/users/user-control/user.service';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

const BACKEND_URL = environment.apiUrl + '/user';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.scss'],
})
export class UserSettingsComponent implements OnInit {
  // STATE
  // subs
  private _userStoreSub: Subscription;
  private _businessStoreSub: Subscription;
  private _locationStoreSub: Subscription;
  // loading state
  appLoading: boolean;
  userLoading: boolean;
  businessLoading: boolean;
  locationLoading: boolean;
  // THEME
  private _themeSub: Subscription;
  themeMode: string;
  themePref: string;

  // USER
  user: User;
  userRole: string;
  userDept: string;
  userLocations: Location[];

  // FORM
  userProfileForm: FormGroup;
  userPhoto: string;
  userPhotoUpload: Blob | null;
  imagePreview: string;
  mimeType: string;
  mimeTypeValid = true;
  fileSizeOk = true;

  constructor(
    private _http: HttpClient,
    private _router: Router,
    private _userService: UserService,
    private _store: Store<fromAppStore.AppState>,
    private _themeService: ThemeService
  ) {}

  ngOnInit() {
    this._userStoreSub = this._store.select('user').subscribe((userState) => {
      this.appLoading = userState.loading;
      this.userLoading = userState.loading;
      this.user = userState.user;
      this.userDept = userState.user?.userProfile.department;
      this.userPhoto = this.user?.userProfile.userPhoto;
      this.setUserRoleString(userState.user?.userProfile.role);
    });
    this._initUserProfileForm();

    this._themeService.getThemeMode();
    this._themeSub = this._themeService.themeStatus.subscribe(
      (themeModeData) => {
        this.themeMode = themeModeData;
        this.themePref = themeModeData;
      }
    );
    console.log(this.themeMode)
  }

  setUserRoleString(intRole: number): void {
    switch (intRole) {
      case 3:
        this.userRole = 'owner';
        break;
      case 2:
        this.userRole = 'manager';
        break;
      case 1:
        this.userRole = 'staff';
        break;
    }
  }

  onUserProfileSubmit(userProfileForm: FormGroup) {
    this.userProfileForm.updateValueAndValidity();
    if (userProfileForm.invalid) {
      return;
    }

    this._userService.updateUserProfile(
      userProfileForm,
      this.userPhotoUpload,
      this.userRole,
      this.userDept
    );
    this.onResetForm();
    this._initUserProfileForm();
  }

  onResetForm() {
    this.mimeTypeValid = true;
    this.fileSizeOk = true;
    this.imagePreview = null;
    this.themePref = this.user.userProfile.themePref;
    this._initUserProfileForm();
  }

  onDepartmentSelect(dept: Event) {
    console.log(dept);
    this.userProfileForm.get('department').setValue(dept);
    this.userProfileForm.updateValueAndValidity();
  }

  onThemeToggle($event: MatSlideToggleChange) {
    this.themePref = $event.checked ? 'theme-dark' : 'theme-light';
    this.userProfileForm.get('themePref').setValue(this.themePref);
    this.userProfileForm.updateValueAndValidity();
    this._themeService.switchThemeMode(this.themePref);
  }

  onAvatarPicked(event: Event) /* CHECK FILE TYPE AND SIZE */ {
    // EXTRACT THE FILE FROM THE FILE PICKER INPUT
    this.userPhotoUpload = (event.target as HTMLInputElement).files[0];

    // SET FORM VALUE AS INPUT FILE
    this.userProfileForm.patchValue({ userPhoto: this.userPhotoUpload });
    this.userProfileForm.get('userPhoto').updateValueAndValidity();

    // READ AND VALIDATE THE FILE
    const reader = new FileReader();
    reader.onloadend = () => {
      this.imagePreview = reader.result as string;
      this.mimeType = this.userPhotoUpload.type;

      // CHECK FILE SIZE AND ASSIGN VALIDITY VALUE
      this.fileSizeOk = this.userPhotoUpload.size < 5000000 ? true : false;

      // CHECK MIME TYPE AND ASSIGN VALIDITY VALUE
      switch (this.mimeType) {
        case 'image/png':
        case 'image/jpg':
        case 'image/jpeg':
          this.mimeTypeValid = true;
          break;
        default:
          this.mimeTypeValid = false;
          break;
      }

      // IF MIME TYPE IS INVALID, SET FORM ERROR
      if (!this.mimeTypeValid) {
        this.userProfileForm
          .get('userPhoto')
          .setErrors({ invalidMimeType: true });

        // IF FILE IS TOO LARGE, SET FORM ERROR
      } else if (!this.fileSizeOk) {
        this.userProfileForm.get('userPhoto').setErrors({ fileTooLarge: true });
      }
    };

    this.userProfileForm.get('userPhoto').updateValueAndValidity();
    reader.readAsDataURL(this.userPhotoUpload);
    console.log(this.userProfileForm.value);
  }

  private _initUserProfileForm() {
    this.userProfileForm = new FormGroup({
      email: new FormControl(
        { value: this.user.email, disabled: true },
        {
          validators: [Validators.required],
        }
      ),
      department: new FormControl(
        { value: this.user.userProfile.department, disabled: true },
        {
          validators: [Validators.required],
        }
      ),
      firstName: new FormControl(this.user.userProfile.firstName, {
        validators: [Validators.required],
      }),
      lastName: new FormControl(this.user.userProfile.lastName, {
        validators: [Validators.required],
      }),
      phoneNumber: new FormControl(this.user.userProfile.phoneNumber, {
        validators: [Validators.required],
      }),
      themePref: new FormControl(this.themePref, {
        validators: [Validators.required],
      }),
      userPhoto: new FormControl(null),
    });
    console.log(this.userProfileForm.value);
  }
}
