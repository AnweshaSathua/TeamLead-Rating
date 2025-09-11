import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';

interface Task {
  id: string;
  name: string;
  prLink: string;
  description: string;
  status: string;
  hours: string | number;
  extraHours:string | number;
}
interface Employee {
  employeeId: string;
  employeeName: string;
  tasks: Task[];
}

interface Evaluation {
  employeeId: string;
  rating: number;
  remarks: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './employee.component.html',
  styleUrls: ['./employee.component.css']
})
export class EmployeeComponent implements OnInit {
  
  // Properties
  teamLeadId: string = ''; // This would come from login service
  teamLeadName: string = '';
  selectedDate: string = '';
  employees: Employee[] = [];
  selectedTask: Task | null = null;
  showTaskModal: boolean = false;
  ratings: { [key: string]: number } = {};
  remarks: { [key: string]: string } = {};
  dropdownOpen: { [key: string]: boolean } = {};
  employeeForm: any;
  constructor(private http: HttpClient, private activatedRoute: ActivatedRoute) {}

  ngOnInit(): void {
   // ✅ Step 1: check for employeeId in URL → fallback to localStorage
    this.activatedRoute.queryParamMap.subscribe(params => {
      const empIdFromUrl = params.get('employeeId');
      const storedEmpId = localStorage.getItem('employeeId');

      if (empIdFromUrl) {
        this.teamLeadId = empIdFromUrl;
        localStorage.setItem('employeeId', empIdFromUrl);
        this.loadTeamLeadDetails(empIdFromUrl);
      } else if (storedEmpId) {
        this.teamLeadId = storedEmpId;
        this.loadTeamLeadDetails(storedEmpId);
      } else {
        console.warn('⚠️ No employeeId found in URL or localStorage!');
      }
    });
  }

  // Load team lead name from backend (simulated)
  private loadTeamLeadDetails(employeeId: string): void {
    this.http.get<any>(`https://192.168.0.22:8243/employee/api/${employeeId}`)
      .subscribe({
        next: (res) => {
          this.teamLeadName = res.employeeName || 'Unknown TL';
        },
        error: (err) => {
          console.error('Error fetching team lead details:', err);
          this.teamLeadName = 'Unknown TL';
        }
      });
  }

  // Handle date save - fetch employees data
  onDateSave(): void {
    if (this.selectedDate && this.teamLeadId) {
      this.http.get<Employee[]>(`https://192.168.0.22:8243/employee/api/v1/tasks/by-date?date=${this.selectedDate}&employeeId=${this.teamLeadId}`)
        .subscribe({
          next: (res) => {
          // 🔥 Map string[] → Task[]
          this.employees = res.map(emp => ({
            ...emp,
            tasks: (emp.tasks as unknown as string[]).map((taskName, index) => ({
              id: `${emp.employeeId}-${index}`, // fake ID
              name: taskName,
              prLink:  '',
              description: '',
              status:'',
              hours: '',
              extraHours:''
            }))
          }));
          console.log('Mapped employees:', this.employees);
        },
        error: (err) => {
          console.error('Error fetching employees', err);
          this.employees = [];
        }
      });
  }
}
  // Toggle dropdown for task selection
  toggleDropdown(employeeId: string): void {
    this.dropdownOpen[employeeId] = !this.dropdownOpen[employeeId];
    
    // Close other dropdowns
    Object.keys(this.dropdownOpen).forEach(key => {
      if (key !== employeeId) {
        this.dropdownOpen[key] = false;
      }
    });
  }

  // Handle task selection
  onTaskSelect(employeeId: string, task: Task): void {
  // Optimistically set selectedTask so popup opens immediately
  this.selectedTask = { ...task, employeeId } as Task & { employeeId: string };
  this.showTaskModal = true;
  this.dropdownOpen[employeeId] = false;

 // ✅ If task.id looks like a fake id (contains "-"), skip backend call
  if (task.id.includes('-')) {
    console.log('Skipping backend fetch for fake task:', task);
    return;
  }

  // ✅ If it's a real backend task id, fetch details
  this.http.get<Task>(`https://192.168.0.22:8243/employee/rating/getTasks?taskId=${task.id}`)
    .subscribe({
      next: (res:any) => {
      this.selectedTask = {
        id: res.id,
        name: res.task,   // 🔥 map backend "task" → frontend "name"
        prLink: res.prLink,
        description: res.description,
        status: res.status,
        hours: res.hours,
        extraHours: res.extraHours,
        employeeId
      } as Task & { employeeId: string }; 
      },
      error: (err) => {
        console.error('Error fetching task details:', err);
        // Keep fallback task shown
      }
    });
}

  // Close task modal
  closeTaskModal(): void {
    this.showTaskModal = false;
    this.selectedTask = null;
  }

  // Handle rating change
  onRatingChange(employeeId: string, rating: number): void {
    this.ratings[employeeId] = rating;
  }

  // Handle remark change
  onRemarkChange(employeeId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.remarks[employeeId] = target.value;
    }
  }

  // Get rating for employee
  getRating(employeeId: string): number {
    return this.ratings[employeeId] || 0;
  }

  // Get remark for employee
  getRemark(employeeId: string): string {
    return this.remarks[employeeId] || '';
  }

  // Check if star should be filled
  isStarFilled(employeeId: string, starNumber: number): boolean {
    return this.getRating(employeeId) >= starNumber;
  }

  // Get status class for styling
  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed':
        return 'status-completed';
      case 'In Progress':
        return 'status-in-progress';
      case 'Pending':
        return 'status-pending';
      default:
        return '';
    }
  }

  // Reset form
  onReset(): void {
    this.selectedDate = '';
    this.employees = [];
    this.ratings = {};
    this.remarks = {};
    this.selectedTask = null;
    this.showTaskModal = false;
    this.dropdownOpen = {};
  }

  // Submit form
  onSubmit(): void {
    const evaluations: Evaluation[] = this.employees.map(emp => ({
      employeeId: emp.employeeId,
      rating: this.ratings[emp.employeeId] || 0,
      remarks: this.remarks[emp.employeeId] || ''
    }));

    const submissionData = {
      teamLeadId: this.teamLeadId,
      date: this.selectedDate.split('-').reverse().join('-'),
      evaluations: evaluations
    };

    this.http.post('https://192.168.0.22:8243/employee/rating/submit', submissionData)
      .subscribe({
        next: () => {
          alert('Data submitted successfully!');
        },
        error: (err) => {
          console.error('Error submitting evaluations', err);
          alert('Error while submitting data!');
        }
      });
  }

  // Exit application
  onExit(): void {
    if (confirm('Are you sure you want to exit?')) {
      // In real app, navigate to login or close application
      window.close();
    }
  }

  // Check if form is valid for submission
  isFormValid(): boolean {
    return this.selectedDate !== '' && this.employees.length > 0;
  }
}
