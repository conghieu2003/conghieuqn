import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

// Type definitions (these would normally come from other files)
interface Document {
  document_id: string;
  markdown?: string;
  // ... other properties
}

interface MenuItem {
  menu_id: string;
  menu_name: string;
  menu_code: string;
  link?: string;
  parent_menu_id?: string;
  document_id?: string;
  project_id: string;
  // ... other properties
}

interface TocItem {
  // ... toc item properties
}

interface DocumentContextType {
  documents: Document[];
  menuItems: MenuItem[];
  menuTree: MenuItem[];
  selectedDocument: Document | null;
  selectedDocumentId: string | null;
  loading: boolean;
  error: string | null;
  tocItems: TocItem[];
  currentHeading?: string;
  hasContent: boolean;
  projectId: string;
  projectCode: string;
  expandedMenus: string[];
  selectedMenuId: string | null;
  noDocumentMessage: string | null;
  setProjectId: (id: string) => void;
  setProjectCode: (code: string) => void;
  setSelectedDocumentId: (id: string | null) => void;
  setTocItems: (items: TocItem[]) => void;
  setCurrentHeading: (heading?: string) => void;
  setHasContent: (hasContent: boolean) => void;
  toggleMenuExpanded: (menuId: string) => void;
  setSelectedMenuId: (menuId: string | null) => void;
  isMenuExpanded: (menuId: string) => boolean;
  selectMenuItem: (menuId: string, documentId: string | null) => void; 
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

interface DocumentProviderProps {
  children: ReactNode;
  initialProjectCode?: string;
}

// Mock functions (these would normally come from other files)
const fetchMenuAndDocuments = async (projectCode: string): Promise<{ menuItems: MenuItem[], documents: Document[] }> => {
  // Mock implementation
  return { menuItems: [] as MenuItem[], documents: [] as Document[] };
};

const buildMenuTree = (menuItems: MenuItem[]): MenuItem[] => {
  // Mock implementation
  return menuItems;
};

const fetchDocumentByIdAlternative = async (documentId: string): Promise<Document | null> => {
  // Mock implementation
  return null;
};

export const DocumentProvider: React.FC<DocumentProviderProps> = ({ children, initialProjectCode }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>('');
  const [projectCode, setProjectCode] = useState<string>('');
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [currentHeading, setCurrentHeading] = useState<string | undefined>(undefined);
  const [hasContent, setHasContent] = useState<boolean>(false);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [noDocumentMessage, setNoDocumentMessage] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const location = useLocation();
  const params = useParams<{ projectCode?: string; link?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const projectCodeFromParams = params.projectCode;
    const projectCodeFromQuery = new URLSearchParams(location.search).get('project_code');
    const effectiveProjectCode = projectCodeFromParams || projectCodeFromQuery || initialProjectCode || '';

    if (!effectiveProjectCode) {
      setLoading(false);
      return;
    }
    setProjectCode(effectiveProjectCode);

    setSelectedDocumentId(null);
    setSelectedDocument(null);
    setDocuments([]);
    setMenuItems([]);
    setDataLoaded(false);
  }, [params.projectCode, location.search, initialProjectCode]);

  useEffect(() => {
    if (!projectCode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        const { menuItems: items, documents: docs } = await fetchMenuAndDocuments(projectCode);
        console.log('Fetched menuItems:', items);  
        console.log('Fetched documents:', docs); 
        if (items.length === 0) {
          setError(`Không có dữ liệu menu từ API cho project_code: ${projectCode}`);
        } else {
          setMenuItems(items);
          setDocuments(docs);
          setProjectId(items[0]?.project_id || '');
          setDataLoaded(true);
        }
      } catch (err) {
        setError(`Lỗi khi tải dữ liệu từ API cho project_code ${projectCode}: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectCode]);

  const handleUrlNavigation = useCallback((projectCode: string, link: string) => {
    if (!dataLoaded || menuItems.length === 0 || isNavigating) return;

    setIsNavigating(true);
    const pathSegments = link.split('/').filter(segment => segment);
    let currentMenuItems = menuItems;
    let currentMenuItem: MenuItem | undefined;
    const ancestors: string[] = [];

    for (const segment of pathSegments) {
      const matchingMenuItem = currentMenuItems.find(item => {
        const itemLink = item.link
          ? item.link.startsWith('/')
            ? item.link.substring(1)
            : item.link
          : item.menu_code;
        return itemLink === segment || item.menu_code === segment;
      });

      if (!matchingMenuItem) {
        // selectDefaultDocument();
        setIsNavigating(false);
        return;
      }

      currentMenuItem = matchingMenuItem;
      ancestors.push(matchingMenuItem.menu_id);
      currentMenuItems = menuItems.filter(item => item.parent_menu_id === matchingMenuItem.menu_id);
    }

    if (currentMenuItem) {
      setSelectedMenuId(currentMenuItem.menu_id);

      setExpandedMenus(prev => {
        const newExpanded = Array.from(new Set([...prev, ...ancestors])); 
        return newExpanded;
      });
      if (currentMenuItem.document_id && currentMenuItem.document_id.trim() !== '') {
        setSelectedDocumentId(currentMenuItem.document_id);
        setNoDocumentMessage(null);
      } else {
        const firstChildWithDoc = menuItems.find(
          item =>
            item.parent_menu_id === currentMenuItem!.menu_id &&
            item.document_id &&
            item.document_id.trim() !== ''
        );

        if (firstChildWithDoc) {
          setSelectedDocumentId(firstChildWithDoc.document_id);
          setNoDocumentMessage(null);
        } else {
          setSelectedDocumentId(null);
          setNoDocumentMessage(`Tài liệu cho mục "${currentMenuItem.menu_name}" chưa được cập nhật.`);
        }
      }
    } else {
      setSelectedMenuId(null);
      setSelectedDocumentId(null);
      setNoDocumentMessage('Không tìm thấy menu item cho đường dẫn này.');
    }
    setIsNavigating(false);
  }, [dataLoaded, menuItems, isNavigating]);

  useEffect(() => {
    if (!selectedDocumentId) {
      setSelectedDocument(null);
      return;
    }
    const findDocument = async () => {
      setLoading(true);
      let doc = documents.find(d => d.document_id === selectedDocumentId); 
      if (!doc || (!doc.markdown || doc.markdown.trim() === '')) {
        try {
          const alternativeDoc = await fetchDocumentByIdAlternative(selectedDocumentId); 
          if (alternativeDoc && alternativeDoc.markdown) {
            doc = alternativeDoc;
          } else {
            setError(`Không tìm thấy nội dung tài liệu có ID: ${selectedDocumentId}`);
          }
        } catch (err) {
          setError(`Lỗi khi tải tài liệu có ID: ${selectedDocumentId} - ${(err as Error).message}`);
        }
      }
      setSelectedDocument(doc || null);
      setHasContent(!!doc?.markdown && doc.markdown.trim() !== '');
      setLoading(false);
    };
    findDocument();
  }, [selectedDocumentId, documents]);

  const toggleMenuExpanded = useCallback((menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  }, []);

  const isMenuExpanded = useCallback((menuId: string) => {
    return expandedMenus.includes(menuId);
  }, [expandedMenus]);

  const selectMenuItem = useCallback((menuId: string, documentId: string | null) => {
    setSelectedMenuId(menuId);
    const menuItem = menuItems.find(item => item.menu_id === menuId);
    if (!menuItem) return;
    if (menuItem.parent_menu_id) {
      setExpandedMenus(prev =>
        prev.includes(menuItem.parent_menu_id)
          ? prev
          : [...prev, menuItem.parent_menu_id]
      );
    }
    const hasChildren = menuItems.some(item => item.parent_menu_id === menuId);
    if (hasChildren) {
      setExpandedMenus(prev =>
        prev.includes(menuId) ? prev : [...prev, menuId]
      );
    }
    if (documentId) {
      setSelectedDocumentId(documentId);
      setNoDocumentMessage(null);
    } else {
      setSelectedDocumentId(null);
      setNoDocumentMessage(`Tài liệu cho mục "${menuItem.menu_name}" chưa được cập nhật.`);
    }
  }, [menuItems]);

  // ⭐ QUAN TRỌNG: useEffect để xử lý navigation khi URL thay đổi
  useEffect(() => {
    if (!dataLoaded || !projectCode || isNavigating) return;
    
    const link = params.link;
    if (link) {
      console.log('Handling URL navigation:', projectCode, link);
      handleUrlNavigation(projectCode, link);
    }
  }, [params.link, projectCode, dataLoaded, handleUrlNavigation, isNavigating]);

  const menuTree = buildMenuTree(menuItems);
  
  const value = {
    documents,
    menuItems,
    menuTree,
    selectedDocument,
    selectedDocumentId,
    loading,
    error,
    tocItems,
    currentHeading,
    hasContent,
    projectId,
    projectCode,
    expandedMenus,
    selectedMenuId,
    noDocumentMessage,
    setProjectId,
    setProjectCode,
    setSelectedDocumentId,
    setTocItems,
    setCurrentHeading,
    setHasContent,
    toggleMenuExpanded,
    setSelectedMenuId,
    isMenuExpanded,
    selectMenuItem,
  };
  
  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocumentContext = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocumentContext must be used within a DocumentProvider');
  }
  return context;
}