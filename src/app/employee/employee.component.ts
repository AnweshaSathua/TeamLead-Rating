import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { HttpClient } from '@angular/common/http';
import { Component, Renderer2, ChangeDetectorRef } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

// ---------------- Interfaces ----------------
export interface Employee {
  employeeId: string;
  employeeName: string;
  selectedTasks: string[];
  tasks: string[];
  status: string;
  hours: number;
  extraHours: number;
  remark: string;
}

export interface DashboardResponse {
  ratings: Employee[];
  tasks: string[];
}

// ---------------- Component ----------------
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatSelectModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatTableModule,
    MatDialogModule,
  ],
  providers: [MatDatepickerModule],
  templateUrl: './employee.component.html',
  styleUrls: ['./employee.component.css'],
  animations: [
    trigger('fabAnimation', [
      transition(':enter', [
        query('.fab-btn', [
          style({ opacity: 0 }),
          stagger(100, [
            animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
          ])
        ])
      ])
    ])
  ]
})
export class EmployeeComponent {
  isDarkMode = false;

  displayedColumns = [
    'employeeId',
    'employeeName',
    'tasks',
    'status',
    'hours',
    'extraHours',
    'rating',
    'remark'
  ];

  employeeForm: FormGroup;
  editRowMap: { [index: number]: boolean } = {};
  dataSource = new MatTableDataSource<FormGroup>();

  // hold available task options for dropdowns
  allTasks: string[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private renderer: Renderer2,
    private cdRef: ChangeDetectorRef,
    private dialog: MatDialog
  ) {
    this.employeeForm = this.fb.group({
      date: ['', Validators.required],
      employeeList: this.fb.array([this.createEmployeeGroup()])
    });

    // Initially set first row editable
    this.editRowMap[0] = true;
  }

  // Getters
  get employeeList(): FormArray {
    return this.employeeForm.get('employeeList') as FormArray;
  }

  // Create Employee FormGroup
  createEmployeeGroup(): FormGroup {
    return this.fb.group({
      employeeId: ['', Validators.required],
      employeeName: ['', [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/)]],
      tasks: ['', Validators.required],
      taskOptions: [[]],
      status: ['', Validators.required],
      hours: ['', Validators.required],
      extraHours: ['', Validators.required],
      rating: [0, [Validators.required, Validators.min(1), Validators.max(6)]],
      remark: ['']
    });
  }

  onDateChange(event: any) {
    const selectedDate = event.target.value;
    console.log('Selected date:', selectedDate);
  }

  onSaveDate() {
    const selectedDate = this.employeeForm.get('date')?.value;
    if (!selectedDate) {
      this.employeeForm.get('date')?.markAsTouched();
      return;
    }
    this.fetchEmployees(selectedDate);
  }

  // ---------------- Fetch employees ----------------
  // ---------------- Fetch employees ----------------
fetchEmployees(date: string) {
  const tlemail = 'tsribatsapatro@gmail.com'; // replace with dynamic later

  this.http.get<any>(`https://192.168.0.22:8243/employee/api/teamlead/dashboard/${tlemail}`)
    .subscribe({
      next: (res: any) => {
        console.log('API returned:', res);

        // If backend wraps inside body
        const data = res.body ? res.body : res;

        if (!Array.isArray(data.ratings)) {
          console.error('Expected ratings array but got:', data.ratings);
          return;
        }

        this.allTasks = data.tasks || [];
        this.employeeList.clear();

        data.ratings.forEach((emp: any) => {
          this.employeeList.push(this.fb.group({
            employeeId: [emp.employeeId],
            employeeName: [emp.employeeName],
            tasks: [emp.selectedTasks],
            taskOptions: [data.tasks],
            status: [emp.status],
            hours: [emp.hours],
            extraHours: [emp.extraHours],
            rating: ['', [Validators.required, Validators.min(1), Validators.max(6)]],
            remark: [emp.remark],
          }));
        });

        this.dataSource.data = this.employeeList.controls as FormGroup[];
        this.dataSource._updateChangeSubscription();
        this.cdRef.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching employees:', err);
      }
    });
}


  // ---------------- Submit ----------------
  onSubmit() {
    this.employeeForm.markAllAsTouched();
    if (this.employeeForm.valid) {
      const formValue = this.employeeForm.getRawValue();
      const tlemail = 'tsribatsapatro@gmail.com';

      this.http.post(`https://192.168.0.22:8243/employee/rating/teamlead/daily/${tlemail}`, formValue)
        .subscribe({
          next: () => alert('Data submitted successfully!'),
          error: (err) => {
            console.error('Submission error:', err);
            let msg = `Error submitting data (Status: ${err.status || 'Unknown'})`;
            alert(msg);
          }
        });
    } else {
      this.scrollToFirstError();
    }
  }

  // ---------------- Helpers ----------------
  onTaskSelect(index: number, dialogTemplate: any) {
    const selectedTask = this.employeeList.at(index).get('tasks')?.value;
    if (selectedTask) {
      this.dialog.open(dialogTemplate, {
        width: '400px',
        data: selectedTask
      });
    }
  }

  onReset(): void {
    this.employeeForm.reset();
    this.employeeList.clear();
    this.refreshTable();
  }

  onExit() {
    if (confirm('Are you sure you want to exit?')) {
      window.open('', '_self');
      window.close();
      window.location.href = 'about:blank';
    }
  }

  scrollToFirstError(): void {
    const firstInvalid = document.querySelector('.ng-invalid') as HTMLElement | null;
    if (firstInvalid) {
      setTimeout(() => {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }, 0);
    }
  }

  private refreshTable(): void {
    this.dataSource.data = this.employeeList.controls as FormGroup[];
    this.cdRef.detectChanges();
  }

  ngOnInit() {
    this.refreshTable();
  }
}
