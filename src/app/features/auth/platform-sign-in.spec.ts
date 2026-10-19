import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PlatformSsoService } from '@core/auth/platform-sso.service';
import { PlatformSignIn } from './platform-sign-in';

const CONFIG = {
  authorizationEndpoint: 'https://auth.example.com/realms/occpl/protocol/openid-connect/auth',
  tokenEndpoint: 'https://auth.example.com/realms/occpl/protocol/openid-connect/token',
  clientId: 'courier-web'
};

describe('PlatformSignIn', () => {
  const begin = vi.fn();

  function open(params: Record<string, string>, query: Record<string, string>, lastCompany: string | null = null) {
    begin.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformSsoService, useValue: { config: () => of(CONFIG), begin, lastCompany } },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(params), queryParamMap: convertToParamMap(query) } }
        }
      ]
    });
    const fixture = TestBed.createComponent(PlatformSignIn);
    fixture.detectChanges();
    return fixture;
  }

  it('starts the sign-in for the company in the path (/sso/<company id>)', () => {
    open({ company: 'from-path' }, {});
    expect(begin).toHaveBeenCalledWith(CONFIG, 'from-path');
  });

  it('still accepts the company as a query parameter', () => {
    open({}, { company: 'from-query' });
    expect(begin).toHaveBeenCalledWith(CONFIG, 'from-query');
  });

  it('prefers the path over the query and over the remembered company', () => {
    open({ company: 'from-path' }, { company: 'from-query' }, 'remembered');
    expect(begin).toHaveBeenCalledWith(CONFIG, 'from-path');
  });

  it('asks the person to open Courier from the platform when no company is known', () => {
    const fixture = open({}, {});
    expect(begin).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Open Courier from the OCCPL platform');
  });
});
