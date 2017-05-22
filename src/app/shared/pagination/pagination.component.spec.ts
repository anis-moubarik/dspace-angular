// ... test imports
import {
  async,
  ComponentFixture,
  inject,
  TestBed, fakeAsync, tick, getTestBed
} from '@angular/core/testing';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DebugElement
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import Spy = jasmine.Spy;
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Store, StoreModule } from "@ngrx/store";

// Load the implementations that should be tested
import { CommonModule } from '@angular/common';

import { Ng2PaginationModule } from 'ng2-pagination';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { PaginationComponent } from './pagination.component';
import { PaginationOptions } from '../../core/cache/models/pagination-options.model';
import { MockTranslateLoader } from "../testing/mock-translate-loader";

import { GLOBAL_CONFIG, EnvConfig } from '../../../config';
import { MockStore, MockAction } from "../testing/mock-store";
import { ActivatedRouteStub, RouterStub } from "../testing/router-stubs";

function createTestComponent<T>(html: string, type: {new (...args: any[]): T}): ComponentFixture<T> {
  TestBed.overrideComponent(type, {
    set: { template: html }
  });
  let fixture = TestBed.createComponent(type);

  fixture.detectChanges();
  return fixture as ComponentFixture<T>;
}

function expectPages(fixture: ComponentFixture<any>, pagesDef: string[]): void {
  let de = fixture.debugElement.query(By.css('.pagination'));
  let pages = de.nativeElement.querySelectorAll('li');

  expect(pages.length).toEqual(pagesDef.length);

  for (let i = 0; i < pagesDef.length; i++) {
    let pageDef = pagesDef[i];
    let classIndicator = pageDef.charAt(0);

    if (classIndicator === '+') {
      expect(pages[i].classList.contains("active")).toBeTruthy();
      expect(pages[i].classList.contains("disabled")).toBeFalsy();
      expect(normalizeText(pages[i].textContent)).toEqual(pageDef.substr(1) + ' (current)');
    } else if (classIndicator === '-') {
      expect(pages[i].classList.contains("active")).toBeFalsy();
      expect(pages[i].classList.contains("disabled")).toBeTruthy();
      expect(normalizeText(pages[i].textContent)).toEqual(pageDef.substr(1));
      if (normalizeText(pages[i].textContent) !== '...') {
        expect(pages[i].querySelector('a').getAttribute('tabindex')).toEqual('-1');
      }
    } else {
      expect(pages[i].classList.contains("active")).toBeFalsy();
      expect(pages[i].classList.contains("disabled")).toBeFalsy();
      expect(normalizeText(pages[i].textContent)).toEqual(pageDef);
      if (normalizeText(pages[i].textContent) !== '...') {
        expect(pages[i].querySelector('a').hasAttribute('tabindex')).toBeFalsy();
      }
    }
  }
}

function changePageSize(fixture: ComponentFixture<any>, pageSize: string): void {
  let buttonEl = fixture.nativeElement.querySelector('#paginationControls');
  let activatedRouteStub: ActivatedRouteStub;
  let routerStub: RouterStub;

  buttonEl.click();

  let dropdownMenu = fixture.debugElement.query(By.css('#paginationControlsDropdownMenu'));
  let buttons = dropdownMenu.nativeElement.querySelectorAll('button');

  for (let i = 0; i < buttons.length; i++) {
    if (buttons[i].textContent.trim() == pageSize) {
      buttons[i].click();
      fixture.detectChanges();
      break;
    }
  }
}

function changePage(fixture: ComponentFixture<any>, idx: number): void {
  let de = fixture.debugElement.query(By.css('.pagination'));
  let buttons = de.nativeElement.querySelectorAll('li');

  buttons[idx].querySelector('a').click();
  fixture.detectChanges();
}

function normalizeText(txt: string): string {
  return txt.trim().replace(/\s+/g, ' ');
}

describe('Pagination component', () => {

  let fixture: ComponentFixture<PaginationComponent>;
  let comp: PaginationComponent;
  let testComp: TestComponent;
  let testFixture: ComponentFixture<TestComponent>;
  let de: DebugElement;
  let html;
  let mockStore: any;

  let activatedRouteStub: ActivatedRouteStub;
  let routerStub: RouterStub;

  //Define initial state and test state
  let _initialState = { width: 1600, height: 770, breakPoint: 'xl' };

  // async beforeEach
  beforeEach(async(() => {
    activatedRouteStub = new ActivatedRouteStub();
    routerStub = new RouterStub();
    mockStore = new MockStore(_initialState);

    TestBed.configureTestingModule({
      imports: [CommonModule, StoreModule.provideStore({}), TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useClass: MockTranslateLoader
        }
      }), Ng2PaginationModule, NgbModule.forRoot(),
        RouterTestingModule.withRoutes([
          {path: 'home', component: TestComponent}
        ])],
      declarations: [PaginationComponent, TestComponent], // declare the test component
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: GLOBAL_CONFIG, useValue: EnvConfig },
        { provide: Router, useValue: routerStub },
        { provide: Store, useValue: mockStore },
        PaginationComponent
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    });

  }));

  // synchronous beforeEach
  beforeEach(() => {
    html = `
    <ds-pagination #p="paginationComponent"
                   [paginationOptions]="paginationOptions" 
                   [collectionSize]="collectionSize" 
                   (pageChange)="pageChanged($event)"
                   (pageSizeChange)="pageSizeChanged($event)">
      <ul>
        <li *ngFor="let item of collection | paginate: { itemsPerPage: paginationOptions.pageSize, 
                    currentPage: paginationOptions.currentPage, totalItems: collectionSize }"> {{item}} </li>
      </ul>
    </ds-pagination>`;

    testFixture = createTestComponent(html, TestComponent) as ComponentFixture<TestComponent>;
    testComp = testFixture.componentInstance;

  });

  it('should create Pagination Component', inject([PaginationComponent], (app: PaginationComponent) => {
    expect(app).toBeDefined();
  }));

  it('should render', () => {
    expect(testComp.paginationOptions.id).toEqual('test');
    expect(testComp.paginationOptions.currentPage).toEqual(1);
    expect(testComp.paginationOptions.pageSize).toEqual(10);
    expectPages(testFixture, ['-«', '+1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '»']);
  });

  it('should render and respond to page change', () => {
    testComp.collectionSize = 30;

    changePage(testFixture, 3);
    expectPages(testFixture, ['«', '1', '2', '+3', '-»']);

    changePage(testFixture, 0);
    expectPages(testFixture, ['«', '1', '+2', '3', '»']);
  });

  it('should render and respond to collectionSize change', () => {

    testComp.collectionSize = 30;
    testFixture.detectChanges();
    expectPages(testFixture, ['-«', '+1', '2', '3', '»']);

    testComp.collectionSize = 40;
    testFixture.detectChanges();
    expectPages(testFixture, ['-«', '+1', '2', '3', '4', '»']);
  });

  it('should render and respond to pageSize change', () => {

    testComp.collectionSize = 30;
    testFixture.detectChanges();
    expectPages(testFixture, ['-«', '+1', '2', '3', '»']);

    changePageSize(testFixture, '5');
    expectPages(testFixture, ['-«', '+1', '2', '3', '4', '5', '6', '»']);

    changePageSize(testFixture, '10');
    expectPages(testFixture, ['-«', '+1', '2', '3', '»']);

    changePageSize(testFixture, '20');
    expectPages(testFixture, ['-«', '+1', '2', '»']);
  });

  it('should emit pageChange event with correct value', fakeAsync(() => {

    spyOn(testComp, 'pageChanged');

    changePage(testFixture, 3);
    tick();

    expect(testComp.pageChanged).toHaveBeenCalledWith(3);
  }));

  it('should emit pageSizeChange event with correct value', fakeAsync(() => {

    spyOn(testComp, 'pageSizeChanged');

    changePageSize(testFixture, '5');
    tick();

    expect(testComp.pageSizeChanged).toHaveBeenCalledWith(5);
  }));

  it('should set correct route parameters', fakeAsync(() => {
    let paginationComponent: PaginationComponent = testFixture
      .debugElement.query(By.css('ds-pagination')).references['p'];
    routerStub = testFixture.debugElement.injector.get(Router);

    testComp.collectionSize = 60;

    changePage(testFixture, 3);
    tick();
    expect(routerStub.navigate).toHaveBeenCalledWith([{pageId: 'test', page: 3, pageSize: 10}]);
    expect(paginationComponent.currentPage).toEqual(3);

    changePageSize(testFixture, '20');
    tick();
    expect(routerStub.navigate).toHaveBeenCalledWith([{pageId: 'test', page: 3, pageSize: 20}]);
    expect(paginationComponent.pageSize).toEqual(20);
  }));

  it('should get parameters from route', () => {

    activatedRouteStub = testFixture.debugElement.injector.get(ActivatedRoute);
    activatedRouteStub.testParams = {
      pageId: 'test',
      page: 2,
      pageSize: 20
    };

    testFixture.detectChanges();

    expectPages(testFixture, ['«', '1', '+2', '3', '4', '5', '»']);
    expect(testComp.paginationOptions.currentPage).toEqual(2);
    expect(testComp.paginationOptions.pageSize).toEqual(20);

    activatedRouteStub.testParams = {
      pageId: 'test',
      page: 3,
      pageSize: 40
    };

    testFixture.detectChanges();

    expectPages(testFixture, ['«', '1', '2', '+3', '-»']);
    expect(testComp.paginationOptions.currentPage).toEqual(3);
    expect(testComp.paginationOptions.pageSize).toEqual(40);
  });

  it('should respond to windows resize', () => {
    let paginationComponent: PaginationComponent = testFixture
      .debugElement.query(By.css('ds-pagination')).references['p'];
    mockStore = testFixture.debugElement.injector.get(Store);

    mockStore.nextState({ width: 400, height: 770, breakPoint: 'xs' });

    mockStore.select('hostWindow').subscribe((state) => {
      paginationComponent.windowBreakPoint = state;
      testFixture.detectChanges();
      expectPages(testFixture, ['-«', '+1', '2', '3', '4', '5', '-...', '10', '»']);
      de = testFixture.debugElement.query(By.css('ul.pagination'));
      expect(de.nativeElement.classList.contains("pagination-sm")).toBeTruthy();
    });
  });
});

// declare a test component
@Component({selector: 'test-cmp', template: ''})
class TestComponent {

  collection: string[] = [];
  collectionSize: number;
  paginationOptions = new PaginationOptions();

  constructor() {
    this.collection = Array.from(new Array(100), (x, i) => `item ${i + 1}`);
    this.collectionSize = 100;
    this.paginationOptions.id = 'test';
  }

  pageChanged(page) {
    this.paginationOptions.currentPage = page;
  }

  pageSizeChanged(pageSize) {
    this.paginationOptions.pageSize = pageSize;
  }
}
