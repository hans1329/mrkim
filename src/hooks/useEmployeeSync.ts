import { useState, useCallback } from "react";
import { useEmployees, useFindDuplicateEmployee, useMergeEmployee, useAddHometaxEmployee } from "./useEmployees";
import type { Employee } from "./useEmployees";
import type { HometaxEmployee, MergeCandidate } from "@/components/employees/EmployeeMergeDialog";

interface SyncResult {
  added: number;
  merged: number;
  skipped: number;
}

/**
 * 홈택스에서 가져온 직원 데이터를 동기화하는 훅
 * 중복 감지 시 사용자에게 머지 여부를 확인합니다.
 */
export function useEmployeeSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCandidates, setPendingCandidates] = useState<MergeCandidate[]>([]);
  const [currentCandidate, setCurrentCandidate] = useState<MergeCandidate | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult>({ added: 0, merged: 0, skipped: 0 });

  const { data: existingEmployees } = useEmployees({ status: "재직" });
  const findDuplicate = useFindDuplicateEmployee();
  const mergeEmployee = useMergeEmployee();
  const addHometaxEmployee = useAddHometaxEmployee();

  /**
   * 홈택스에서 가져온 직원 목록을 처리
   * 중복 감지 시 머지 다이얼로그를 띄움
   */
  const syncEmployees = useCallback(async (hometaxEmployees: HometaxEmployee[]) => {
    setIsSyncing(true);
    setSyncResult({ added: 0, merged: 0, skipped: 0 });

    const candidatesNeedingReview: MergeCandidate[] = [];
    const autoAddList: HometaxEmployee[] = [];

    // 1. 각 직원에 대해 중복 체크
    for (const hometaxEmployee of hometaxEmployees) {
      // external_id로 이미 등록된 직원인지 확인
      const alreadyLinked = existingEmployees?.find(
        (e) => e.external_id === hometaxEmployee.external_id
      );

      if (alreadyLinked) {
        // 이미 연동된 직원은 건너뛰기
        continue;
      }

      // 이름으로 중복 체크
      const duplicate = existingEmployees?.find(
        (e) => e.name === hometaxEmployee.name && e.status === "재직"
      );

      if (duplicate) {
        // 중복 발견 - 사용자 확인 필요
        candidatesNeedingReview.push({
          hometaxEmployee,
          existingEmployee: duplicate,
        });
      } else {
        // 중복 없음 - 자동 추가
        autoAddList.push(hometaxEmployee);
      }
    }

    // 2. 중복 없는 직원들은 자동 추가
    for (const emp of autoAddList) {
      try {
        await addHometaxEmployee.mutateAsync({
          name: emp.name,
          external_id: emp.external_id,
          monthly_salary: emp.monthly_salary,
          start_date: emp.start_date,
          employee_type: emp.employee_type,
          position: emp.position,
          department: emp.department,
        });
        setSyncResult((prev) => ({ ...prev, added: prev.added + 1 }));
      } catch (error) {
        console.error("Failed to add employee:", emp.name, error);
      }
    }

    // 3. 중복 발견된 경우 머지 다이얼로그 시작
    if (candidatesNeedingReview.length > 0) {
      setPendingCandidates(candidatesNeedingReview);
      setCurrentCandidate(candidatesNeedingReview[0]);
      setShowMergeDialog(true);
    }

    setIsSyncing(false);
    return { 
      needsReview: candidatesNeedingReview.length > 0,
      autoAdded: autoAddList.length,
    };
  }, [existingEmployees, addHometaxEmployee]);

  /**
   * 사용자가 "같은 사람입니다" 선택 시 병합
   */
  const handleMerge = useCallback(async (existingId: string, hometaxData: HometaxEmployee) => {
    try {
      await mergeEmployee.mutateAsync({
        existingId,
        hometaxData: {
          external_id: hometaxData.external_id,
          monthly_salary: hometaxData.monthly_salary,
          start_date: hometaxData.start_date,
          employee_type: hometaxData.employee_type,
          position: hometaxData.position,
        },
      });
      setSyncResult((prev) => ({ ...prev, merged: prev.merged + 1 }));
    } catch (error) {
      console.error("Failed to merge employee:", error);
    }
    
    processNextCandidate();
  }, [mergeEmployee]);

  /**
   * 사용자가 "다른 사람입니다" 선택 시 새로 등록
   */
  const handleCreateNew = useCallback(async (hometaxData: HometaxEmployee) => {
    try {
      await addHometaxEmployee.mutateAsync({
        name: hometaxData.name,
        external_id: hometaxData.external_id,
        monthly_salary: hometaxData.monthly_salary,
        start_date: hometaxData.start_date,
        employee_type: hometaxData.employee_type,
        position: hometaxData.position,
        department: hometaxData.department,
      });
      setSyncResult((prev) => ({ ...prev, added: prev.added + 1 }));
    } catch (error) {
      console.error("Failed to add employee:", error);
    }
    
    processNextCandidate();
  }, [addHometaxEmployee]);

  /**
   * 사용자가 "건너뛰기" 선택
   */
  const handleSkip = useCallback((hometaxData: HometaxEmployee) => {
    setSyncResult((prev) => ({ ...prev, skipped: prev.skipped + 1 }));
    processNextCandidate();
  }, []);

  /**
   * 다음 중복 후보로 이동
   */
  const processNextCandidate = useCallback(() => {
    setPendingCandidates((prev) => {
      const remaining = prev.slice(1);
      if (remaining.length > 0) {
        setCurrentCandidate(remaining[0]);
      } else {
        setCurrentCandidate(null);
        setShowMergeDialog(false);
      }
      return remaining;
    });
  }, []);

  return {
    isSyncing,
    syncEmployees,
    showMergeDialog,
    setShowMergeDialog,
    currentCandidate,
    remainingCount: pendingCandidates.length - 1,
    handleMerge,
    handleCreateNew,
    handleSkip,
    syncResult,
  };
}
