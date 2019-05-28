import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { switchMap, take, filter } from 'rxjs/operators';
import { DocumentStatus } from 'tanam-models';
import { DocumentTypeService } from '../../../services/document-type.service';
import { DocumentService } from '../../../services/document.service';
import { SiteService } from '../../../services/site.service';
import { firestore } from 'firebase/app';
import { MatSnackBar } from '@angular/material';
import { DialogService } from '../../../services/dialog.service';

@Component({
  selector: 'tanam-document-edit',
  templateUrl: './document-edit.component.html',
  styleUrls: ['./document-edit.component.scss']
})
export class DocumentEditComponent implements OnInit, OnDestroy {
  readonly richTextEditorConfig = {
    // toolbar: ['heading', '|', 'bold', 'italic', '|', 'bulletedList', 'numberedList'],
  };

  readonly document$ = this.route.paramMap.pipe(
    switchMap(params => this.documentService.get(params.get('documentId'))),
    filter(doc => !!doc),
  );
  readonly documentType$ = this.document$.pipe(
    filter(doc => !!doc),
    switchMap(document => this.documentTypeService.getDocumentType(document.documentType)));
  readonly domain$ = this.siteService.getPrimaryDomain();
  readonly documentForm = this.formBuilder.group({
    title: [null, Validators.required],
    url: [null, Validators.required],
    publishStatus: [false, Validators.required],
    canonicalUrl: [null],
    published: [null],
    dataForm: this.formBuilder.group({}),
  });

  private _titleSubscription: Subscription;
  private readonly _subscriptions: Subscription[] = [];
  private _rootSlug: string;
  private _documentType: string;
  metaDataDialog = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly formBuilder: FormBuilder,
    private readonly siteService: SiteService,
    private readonly documentService: DocumentService,
    private readonly documentTypeService: DocumentTypeService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialogService: DialogService
  ) { }

  get dataForm() {
    return this.documentForm.get('dataForm') as FormGroup;
  }

  ngOnInit() {
    this._setStateProcessing(true);
    this._subscriptions.push(this.documentForm.get('publishStatus').valueChanges.subscribe((v) => this._onDocumentStatusChange(v)));
    const combinedDocumentData$ = combineLatest(this.documentType$, this.document$);
    this._subscriptions.push(combinedDocumentData$.subscribe(([documentType, document]) => {
      this._setStateProcessing(true);
      const documentStatusDefault = documentType.documentStatusDefault === 'published' ? true : false;
      this.documentForm.patchValue({
        title: document.title,
        url: document.url || '/',
        publishStatus: document.published === undefined ? documentStatusDefault : document.published,
        published: document.published,
        canonicalUrl: document.canonicalUrl
      });

      this._rootSlug = documentType.slug;
      this._documentType = documentType.id;
      for (const field of documentType.fields) {
        if (!this.dataForm.get(field.key)) {
          const formControl = new FormControl(document.data[field.key]);
          this.dataForm.addControl(field.key, formControl);
          if (field.isTitle) {
            if (!!this._titleSubscription && !this._titleSubscription.closed) {
              this._titleSubscription.unsubscribe();
            }

            this._titleSubscription = this.dataForm.get(field.key).valueChanges.subscribe(v => this._onTitleChange(v));
          }
        }
        this.dataForm.patchValue({
          [field.key]: document.data[field.key],
        });
      }
      this._setStateProcessing(!document.created);
    }));
  }

  ngOnDestroy() {
    this._subscriptions.push(this._titleSubscription);
    this._subscriptions.filter(s => !!s && !s.closed).forEach(s => s.unsubscribe());
  }

  get isScheduled(): boolean {
    return this.documentForm.value.published && this.documentForm.value.published.toMillis() > Date.now();
  }

  get isPublished(): boolean {
    return !!this.documentForm.value.published;
  }

  async deleteEntry() {
    this.dialogService.openDialogConfirm({
      title: 'Delete Document',
      message: `Are you sure to delete the "${this.documentForm.controls['title'].value}" ?`,
      buttons: ['cancel', 'yes'],
      icon: 'warning'
    }).afterClosed().subscribe(async res => {
      if (res === 'yes') {
        this._setStateProcessing(true);
        const document = await this.document$.pipe(take(1)).toPromise();
        await this.documentService.delete(document.id);
        this._navigateBack();
        this._setStateProcessing(false);
      }
    });
  }

  async saveEntry(closeAfterSave: boolean = false) {
    this._snackbar('Saving...');
    const formData = this.documentForm.value;

    const document = await this.document$.pipe(take(1)).toPromise();
    document.title = formData.title;
    document.url = formData.url;
    document.published = formData.published;
    document.data = this.dataForm.value;
    document.canonicalUrl = formData.canonicalUrl || '';
    this._setStateProcessing(true);
    await this.documentService.update(document);
    this._setStateProcessing(false);
    this._snackbar('Saved');
    if (closeAfterSave === true) {
      this._navigateBack();
    }
  }

  cancelEditing() {
    this._navigateBack();
  }

  closeDialog() {
    this.metaDataDialog = false;
  }

  showDialog() {
    this.metaDataDialog = true;
  }

  private _setStateProcessing(isProcessing: boolean) {
    console.log(`[_setStateProcessing] isProcessing=${isProcessing}`);
    if (isProcessing) {
      console.log('disabling form');
      return this.documentForm.disable();
    }
    console.log('enabling form');
    return this.documentForm.enable();
  }

  private _slugify(text: string) {
    return text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  private _navigateBack() {
    this.router.navigateByUrl(`/_/admin/type/${this._documentType}/overview`);
  }

  private _snackbar(message: string) {
    this.snackBar.open(message, 'Dismiss', {
      duration: 2000,
    });
  }

  private _onTitleChange(title: string) {
    this.documentForm.controls['title'].setValue(title);
    if (!!title && !this.documentForm.get('published').value) {
      // Only auto slugify title if document has't been published before
      this.documentForm.controls['url'].setValue(`${this._rootSlug}/${this._slugify(title)}`);
    }
  }

  private _onDocumentStatusChange(publishStatus: boolean) {
    console.log(JSON.stringify({ status: publishStatus }));
    const publishedTimestamp = publishStatus ? firestore.Timestamp.now() : null;
    this.documentForm.controls['published'].setValue(publishedTimestamp);
  }
}
