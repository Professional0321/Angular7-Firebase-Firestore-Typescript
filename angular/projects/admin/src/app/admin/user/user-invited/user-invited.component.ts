import { Component } from '@angular/core';
import { IPageInfo } from 'ngx-virtual-scroller';
import { UserService } from '../../../services/user.service';
import { map, tap } from 'rxjs/operators';
import { ITanamUserRole, TanamUserRoleType } from 'tanam-models/user.models';
import { DialogService } from '../../../services/dialog.service';
import { MatSnackBar } from '@angular/material';

interface TanamRoleOptions {
  value: TanamUserRoleType;
  text: string;
}

@Component({
  selector: 'tanam-user-invited',
  templateUrl: './user-invited.component.html',
  styleUrls: ['./user-invited.component.scss']
})
export class UserInvitedComponent {
  readonly roles: TanamRoleOptions[] = [
    {
      value: 'admin',
      text: 'Admin'
    },
    {
      value: 'superAdmin',
      text: 'Super Admin',
    },
    {
      value: 'publisher',
      text: 'Publisher'
    }
  ];

  items: ITanamUserRole[] = [];
  limit = 20;
  isLoading: boolean;
  isLastItem: boolean;

  constructor(
    private readonly userService: UserService,
    private dialogService: DialogService,
    private snackBar: MatSnackBar
  ) {
  }

  async fetchMore(event: IPageInfo) {
    if (event.endIndex !== this.items.length - 1 || this.isLastItem) {
      return;
    }
    this.isLoading = true;
    const lastItem = this.items.length > 0 ? this.items[this.items.length - 1].email : null;
    let lastVisible = null;
    if (lastItem) {
      lastVisible = await this.userService.getReference(lastItem);
    }
    this.fetchItems(lastVisible);
  }

  fetchItems(lastVisible) {
    this.isLoading = true;
    this.userService.getUserRoles({startAfter: lastVisible})
      .pipe(
        tap(items => {
          if (!items.length || items.length < this.limit) {
            this.isLastItem = true;
          }
        }),
        map(items => {
          const mergedItems = [...this.items, ...items];
          return mergedItems.reduce((acc, cur) => ({...acc, [cur.email]: cur}), {});
        }),
        map(v => Object.values(v))
      ).subscribe((items: any) => {
      this.items = [...items];
      this.isLoading = false;
    });
  }

  deleteInvitedUser(userRole: ITanamUserRole) {
    this.dialogService.openDialogConfirm({
      title: 'Delete File',
      message: `Are you sure to delete "${userRole.email} (${userRole.role})" ?`,
      buttons: ['cancel', 'yes'],
      icon: 'warning'
    }).afterClosed().subscribe(async res => {
      if (res === 'yes') {
        this.snackBar.open('Deleting role...', 'Dismiss', {
          duration: 2000
        });
        await this.userService.deleteUserRole(userRole);
        this.items = this.items.filter(item => item.id !== userRole.id);
        this.snackBar.open('User role deleted', 'Dismiss', {
          duration: 2000
        });
      }
    });
  }
}
