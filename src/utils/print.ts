import type { DepartmentId } from '../types';

export function printDepartment(departmentId: DepartmentId): void {
  document.querySelectorAll('.dept-block').forEach(b => b.classList.remove('print-active'));
  const block = document.getElementById(`block-${departmentId}`);
  if (block) {
    block.classList.add('print-active');
  }
  window.print();
}
