import { Injectable, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import * as firebase from 'firebase/app';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore, AngularFirestoreDocument } from 'angularfire2/firestore';
import { NotifyService } from './notify.service';
import { WindowService } from './window.service';
import { Observable } from 'rxjs/Observable';
import { switchMap } from 'rxjs/operators';

interface User {
  uid: string;
  email?: string | null;
  photoURL?: string;
  displayName?: string;
}

@Injectable()
export class AuthService implements OnInit {

  user: Observable<User | null>;
  windowRef: any;

  constructor(private afAuth: AngularFireAuth,
              private afs: AngularFirestore,
              private router: Router,
              private notify: NotifyService,
              private window: WindowService) {

    this.user = this.afAuth.authState
      .switchMap((user) => {
        if (user) {
          return this.afs.doc<User>(`users/${user.uid}`).valueChanges();
        } else {
          return Observable.of(null);
        }
      });
  }

  ngOnInit() {
    this.windowRef = this.window.windowRef;
  }

  signup(email: string, password: string, phone: string) {
    this.windowRef.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('sign-in-button');
    const appVerifier = this.windowRef.recaptchaVerifier;
    firebase.auth().signInWithPhoneNumber(phone, appVerifier)
      .then((result) => {
        this.windowRef.confirmationResult = result;
        return this.afAuth.auth.signInWithEmailAndPassword(email, password)
          .then((user) => {
            this.notify.update('Welcome', 'success');
            return this.updateUserData(user);
          })
          .catch((error) => this.handleError(error) );
      })
      .catch( (error) => console.log(error) );
  }

  login(email: string, password: string) {
      return this.afAuth.auth.signInWithEmailAndPassword(email, password)
        .then((user) => {
          this.notify.update('Welcome to Firestarter!!!', 'success');
          return this.updateUserData(user); // if using firestore
        })
        .catch((error) => this.handleError(error) );
  }

  // Sends email allowing user to reset password
  resetPassword(email: string) {
    const fbAuth = firebase.auth();

    return fbAuth.sendPasswordResetEmail(email)
      .then(() => this.notify.update('Password update email sent', 'info'))
      .catch((error) => this.handleError(error));
  }

  signOut() {
    this.afAuth.auth.signOut().then(() => {
        this.router.navigate(['/']);
    });
  }

  // If error, console log and notify user
  private handleError(error: Error) {
    console.error(error);
    this.notify.update(error.message, 'error');
  }

  // Sets user data to firestore after succesful login
  private updateUserData(user: User) {

    const userRef: AngularFirestoreDocument<User> = this.afs.doc(`users/${user.uid}`);

    const data: User = {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || 'Guest',
      photoURL: user.photoURL || 'https://goo.gl/Fz9nrQ',
    };
    return userRef.set(data);
  }
}
