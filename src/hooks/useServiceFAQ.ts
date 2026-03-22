import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FAQItem {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
  priority: number;
}

const FALLBACK_RESPONSE = "궁금한 점이 있으시군요! 😊\n\n김비서는 소상공인의 사업장 관리를 도와주는 AI 비서입니다.\n\n더 자세한 내용이 궁금하시면 아래 질문을 눌러보세요!";

export function useServiceFAQ() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFAQs() {
      try {
        const { data, error } = await supabase
          .from("service_faq")
          .select("id, keywords, question, answer, priority")
          .eq("is_active", true)
          .order("priority", { ascending: false });

        if (error) {
          console.error("Failed to load FAQs:", error);
          return;
        }

        setFaqs(data || []);
      } catch (error) {
        console.error("Error loading FAQs:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFAQs();
  }, []);

  const findAnswer = useCallback((input: string): string => {
    const lowerInput = input.toLowerCase();

    // 우선순위 순으로 정렬된 FAQ에서 키워드 매칭
    for (const faq of faqs) {
      const matched = faq.keywords.some((keyword) =>
        lowerInput.includes(keyword.toLowerCase())
      );
      if (matched) {
        return faq.answer;
      }
    }

    return FALLBACK_RESPONSE;
  }, [faqs]);

  const quickQuestions = faqs.slice(0, 3).map((faq) => faq.question);

  return {
    faqs,
    isLoading,
    findAnswer,
    quickQuestions,
  };
}
