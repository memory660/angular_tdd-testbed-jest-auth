import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { SharedModule } from '../shared/shared.module';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;    // Dispositif permettant de déboguer et de tester un composant.

  beforeEach(async () => {                          // on créé un module avec juste le necessaire pour faire fonctionner : LoginComponent
    await TestBed.configureTestingModule({
      declarations: [ LoginComponent ],
      imports: [
        SharedModule,
        HttpClientTestingModule,
        FormsModule,
        RouterTestingModule
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Layout', () => {
    it('has Login header', () => {
      const loginPage = fixture.nativeElement as HTMLElement;
      const h1 = loginPage.querySelector('h1');                       // <h1>Login</h1>
      expect(h1?.textContent).toBe('Login');
    })

    it('has email input', () => {
      const loginPage = fixture.nativeElement as HTMLElement;
      const label = loginPage.querySelector('label[for="email"]');    // <label for="email" class="form-label">E-mail</label>
      const input = loginPage.querySelector('input[id="email"]');     // <input id="email" ...
      expect(input).toBeTruthy();
      expect(label).toBeTruthy();
      expect(label?.textContent).toContain('E-mail');
    })

    it('has password input', () => {
      const loginPage = fixture.nativeElement as HTMLElement;
      const label = loginPage.querySelector('label[for="password"]'); // <label for="password" class="form-label">Password</label>
      const input = loginPage.querySelector('input[id="password"]');  // <input id="password" ...
      expect(input).toBeTruthy();
      expect(label).toBeTruthy();
      expect(label?.textContent).toContain('Password');
    })

    it('has password type for password input', () => {
      const loginPage = fixture.nativeElement as HTMLElement;
      const input = loginPage.querySelector('input[id="password"]') as HTMLInputElement;  // <input id="password" type="password" ...
      expect(input.type).toBe('password');
    })

    it('has Login button', () => {
      const loginPage = fixture.nativeElement as HTMLElement;
      const button = loginPage.querySelector('button');               // <app-button [disabled]="isDisabled()" [apiProgress]="apiProgress">Login</app-button>
      expect(button?.textContent).toContain('Login');
    })

    it('disables the button initially', () => {
      const loginPage = fixture.nativeElement as HTMLElement;
      const button = loginPage.querySelector('button');               // <app-button [disabled]="isDisabled()" [apiProgress]="apiProgress">Login</app-button>
      expect(button?.disabled).toBeTruthy();
    })
  })
  describe('Interactions', () => {
    let button : any;
    let httpTestingController : HttpTestingController;
    let loginPage: HTMLElement;
    let emailInput : HTMLInputElement;
    let passwordInput : HTMLInputElement;

    const setupForm = async (email = 'user1@mail.com') => {
      // HttpTestingController: Contrôleur à injecter dans les tests, qui permet le mocking et le flushing des requêtes.
      httpTestingController = TestBed.inject(HttpTestingController);

      loginPage = fixture.nativeElement as HTMLElement;

      // Ce que fait whenStable(), c'est attendre que toutes les tâches de la NgZone de test soient terminées.
      await fixture.whenStable();

      emailInput = loginPage.querySelector('input[id="email"]') as HTMLInputElement;
      passwordInput = loginPage.querySelector('input[id="password"]') as HTMLInputElement;
      emailInput.value = email;
      // Nous pouvons même utiliser dispatchEvent pour simuler l'événement du composant Angular Material lors des tests, car triggerEventHandler ne fonctionnerait pas dans ce cas puisque Angular ne connaît pas ces événements
      // Cependant, la simple affectation d'une chaîne à la propriété value de l'entrée ne suffit pas, car cela ne déclenchera pas d'événement de modification.
      // Nous le faisons après avoir attribué une valeur à notre entrée.
      // .dispatchEvent n'a rien à voir avec Angular, et fait partie de l'API Web
      // https://developer.mozilla.org/en-US/docs/Web/Events#event_listing
      emailInput.dispatchEvent(new Event('input'));

      // L'événement blur se déclenche lorsqu'un élément a perdu le focus
      emailInput.dispatchEvent(new Event('blur'));
      passwordInput.value = "P4ssword";
      passwordInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      button = loginPage.querySelector('button');
    }

    it('enables the button when all the fields have valid input', async () => {
      await setupForm();
      expect(button?.disabled).toBeFalsy();
    })
    it('does not enable button when fields are invalid', async () => {
      await setupForm('a');
      expect(button?.disabled).toBeTruthy();
    })

    it('sends email and password to backend after clicking the button', async () => {
      await setupForm();
      fixture.detectChanges();
      button?.click();
      // expectOne : S'attend à ce qu'une seule demande correspondant à l'URL donnée ait été faite, et renvoie son simulacre.
      const req = httpTestingController.expectOne("/api/1.0/auth");
      const requestBody = req.request.body;
      expect(requestBody).toEqual({
        password: "P4ssword",
        email: "user1@mail.com"
      })
    })

    it('disables button when there is an ongoing api call', async () => {
      await setupForm();
      button.click();
      fixture.detectChanges();
      button.click();
      httpTestingController.expectOne("/api/1.0/auth");
      expect(button.disabled).toBeTruthy();
    })

    it('displays spinner after clicking the submit', async () => {
      await setupForm();
      expect(loginPage.querySelector('span[role="status"]')).toBeFalsy();   // <span *ngIf="apiProgress" class="spinner-border spinner-border-sm" role="status"></span>
      button.click();
      fixture.detectChanges();
      expect(loginPage.querySelector('span[role="status"]')).toBeTruthy();
    })

    it('displays error after submit failure', async () => {
      await setupForm();
      button.click();
      const req = httpTestingController.expectOne("/api/1.0/auth");
      // le retour de la requete
      req.flush({
        message: 'Incorrect Credentials'                                      // (1)
      }, {
        status: 401,
        statusText: 'Unauthorized'
      });
      fixture.detectChanges();
      const error = loginPage.querySelector(`.alert`);                        // dans :  <app-alert *ngIf="error" type="danger">{{error}}</app-alert>
      expect(error?.textContent).toContain("Incorrect Credentials");          // (1)
    })

    it('hides spinner after sign up request fails', async () => {
      await setupForm();
      button.click();
      const req = httpTestingController.expectOne("/api/1.0/auth");
      req.flush({
        message: 'Incorrect Credentials'
      }, {
        status: 401,
        statusText: 'Unauthorized'
      });
      fixture.detectChanges();
      expect(loginPage.querySelector('span[role="status"]')).toBeFalsy();
    })

    it('clears error after email field is changed', async() => {
      await setupForm();
      button.click();
      const req = httpTestingController.expectOne("/api/1.0/auth");
      req.flush({
        message: 'Incorrect Credentials'
      }, {
        status: 401,
        statusText: 'Unauthorized'
      });
      fixture.detectChanges();
      emailInput.value = "valid@mail.com";
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(loginPage.querySelector(`.alert`)).toBeFalsy();
    })
    it('clears error after password field is changed', async() => {
      await setupForm();
      button.click();
      const req = httpTestingController.expectOne("/api/1.0/auth");
      req.flush({
        message: 'Incorrect Credentials'
      }, {
        status: 401,
        statusText: 'Unauthorized'
      });
      fixture.detectChanges();
      passwordInput.value = "P4ssword2";
      passwordInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(loginPage.querySelector(`.alert`)).toBeFalsy();
    })
  })

  describe('Validation', () => {
    const testCases = [
      { field: 'email', value: '', error: 'E-mail is required'},
      { field: 'email', value: 'wrong-format', error: 'Invalid e-mail address'},
      { field: 'password', value: '', error: 'Password is required'},
    ]

    testCases.forEach(({field, value, error }) => {
      it(`displays ${error} when ${field} has '${value}'`, async () => {
        await fixture.whenStable();
        const loginPage = fixture.nativeElement as HTMLElement;
        expect(loginPage.querySelector(`div[data-testid="${field}-validation"]`)).toBeNull();
        const input = loginPage.querySelector(`input[id="${field}"]`) as HTMLInputElement;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        fixture.detectChanges();
        const validationElement = loginPage.querySelector(`div[data-testid="${field}-validation"]`);
        expect(validationElement?.textContent).toContain(error);
      })
    })
  })
});
