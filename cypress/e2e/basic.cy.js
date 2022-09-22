describe('Before setup instance', () => {
	beforeEach(() => {
		cy.resetState();
	});

	afterEach(() => {
		
		cy.wait(1000);
	});

  it('successfully loads', () => {
    cy.visit('/');
  });

	it('setup instance', () => {
    cy.visit('/');

		cy.intercept('POST', '/api/admin/accounts/create').as('signup');
	
		cy.get('[data-cy-admin-username] input').type('admin');
		cy.get('[data-cy-admin-password] input').type('admin1234');
		cy.get('[data-cy-admin-ok]').click();

		
		cy.wait('@signup');
  });
});

describe('After setup instance', () => {
	beforeEach(() => {
		cy.resetState();

	
		cy.registerUser('admin', 'pass', true);
	});

	afterEach(() => {
		
		cy.wait(1000);
	});

  it('successfully loads', () => {
    cy.visit('/');
  });

	it('signup', () => {
		cy.visit('/');

		cy.intercept('POST', '/api/signup').as('signup');

		cy.get('[data-cy-signup]').click();
		cy.get('[data-cy-signup-username] input').type('alice');
		cy.get('[data-cy-signup-password] input').type('alice1234');
		cy.get('[data-cy-signup-password-retype] input').type('alice1234');
		cy.get('[data-cy-signup-submit]').click();

		cy.wait('@signup');
  });
});

describe('After user signup', () => {
	beforeEach(() => {
		cy.resetState();

	
		cy.registerUser('admin', 'pass', true);

		cy.registerUser('alice', 'alice1234');
	});

	afterEach(() => {
		
		cy.wait(1000);
	});

  it('successfully loads', () => {
    cy.visit('/');
  });

	it('signin', () => {
		cy.visit('/');

		cy.intercept('POST', '/api/signin').as('signin');

		cy.get('[data-cy-signin]').click();
		cy.get('[data-cy-signin-username] input').type('alice');
		
		cy.get('[data-cy-signin-password] input').type('alice1234{enter}');

		cy.wait('@signin');
  });

	it('suspend', function() {
		cy.request('POST', '/api/admin/suspend-user', {
			i: this.admin.token,
			userId: this.alice.id,
		});

		cy.visit('/');

		cy.get('[data-cy-signin]').click();
		cy.get('[data-cy-signin-username] input').type('alice');
		cy.get('[data-cy-signin-password] input').type('alice1234{enter}');

		cy.contains(/アカウントが凍結されています|This account has been suspended due to/gi);
	});
});

describe('After user singed in', () => {
	beforeEach(() => {
		cy.resetState();

		cy.registerUser('admin', 'pass', true);

		cy.registerUser('alice', 'alice1234');

		cy.login('alice', 'alice1234');
	});

	afterEach(() => {
		
		cy.wait(1000);
	});

  it('successfully loads', () => {
		cy.get('[data-cy-open-post-form]').should('be.visible');
  });

	it('note', () => {
		cy.get('[data-cy-open-post-form]').click();
		cy.get('[data-cy-post-form-text]').type('Hello, Speechka!');
		cy.get('[data-cy-open-post-form-submit]').click();

		cy.contains('Hello, Speechka!');
  });
});


