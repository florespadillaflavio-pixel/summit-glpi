import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  LucideAngularModule,
  // Navigation / shell
  LayoutGrid, Menu, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, ArrowLeft, ArrowRight,
  // Auth
  Eye, EyeOff, Mail, Lock, AlertCircle, LogOut, LogIn, User, Undo2,
  // Acciones comunes
  Plus, Search, Edit2, Trash2, Save, X, Download, Upload, Play,
  Bookmark, SlidersHorizontal, GripVertical, MoreVertical, RefreshCw, RefreshCcw,
  // Módulos sidebar
  TicketCheck, Package, BookOpen, FileText, BarChart3, Users, Building2,
  Tag, Settings, Shield, ShieldPlus,
  // Dashboard / stats
  TrendingUp, TrendingDown, Calendar,
  // Tickets
  Clock, AlertTriangle, CheckCircle, Star, Folder, Hash, CheckCircle2, History,
  // Admin
  UserPlus, UserX, Key, Globe, TestTube, Bell,
  // Dispositivos / misc
  Laptop, Smartphone, Building, Database, TabletSmartphone, CalendarDays, DollarSign, Printer, Network,
  // Legacy / UI
  Headset, Headphones, PlusCircle, BarChart, ShieldCheck, LayoutList, ClipboardList,
  Timer, MapPin, FileSignature, PieChart, Pencil, UserCog, ShieldAlert,
  ListChecks, Sliders, UserCheck, Library, PackagePlus, HardDrive, MessageSquare,
  // Nuevos iconos y correcciones
  File, Send, Monitor, Inbox, Loader, SearchX, Construction, Zap, Ticket, Server, Pause,
  ListFilter, CloudUpload, UploadCloud, CircleX, House, Phone, Image, Globe2,
  // Mensajería y actividad
  MessageCircle, Info, Link, ExternalLink, Copy, Circle, Heart,
  // Adicionales para catálogos
  Minus, ArrowDown
} from 'lucide-angular';

import { MatDialogModule } from '@angular/material/dialog';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    importProvidersFrom(
      MatDialogModule,
      LucideAngularModule.pick({
        // Navigation / shell
        LayoutGrid, Menu, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, ArrowLeft, ArrowRight,
        // Auth
        Eye, EyeOff, Mail, Lock, AlertCircle, LogOut, LogIn, User, Undo2,
        // Acciones comunes
        Plus, Search, Edit2, Trash2, Save, X, Download, Upload, Play,
        Bookmark, SlidersHorizontal, GripVertical, MoreVertical, RefreshCw, RefreshCcw,
        // Módulos sidebar
        TicketCheck, Package, BookOpen, FileText, BarChart3, Users, Building2,
        Tag, Settings, Shield, ShieldPlus,
        // Dashboard / stats
        TrendingUp, TrendingDown, Calendar,
        // Tickets / estado
        Clock, AlertTriangle, CheckCircle, Star, Folder, Hash, CheckCircle2, History,
        // Admin
        UserPlus, UserX, Key, Globe, TestTube, Bell,
        // Dispositivos
        Laptop, Smartphone, Building, Database, TabletSmartphone, CalendarDays, DollarSign, Printer, Network,
        // Legacy / UI
        Headset, Headphones, PlusCircle, BarChart, ShieldCheck, LayoutList, ClipboardList,
        Timer, MapPin, FileSignature, PieChart, Pencil, UserCog, ShieldAlert,
        ListChecks, Sliders, UserCheck, Library, PackagePlus, HardDrive, MessageSquare,
        // Nuevos iconos y correcciones
        File, Send, Monitor, Inbox, Loader, SearchX, Construction, Zap, Ticket, Server, Pause,
        ListFilter, CloudUpload, UploadCloud, CircleX, House, Phone, Image, Globe2,
        // Mensajería y actividad
        MessageCircle, Info, Link, ExternalLink, Copy, Circle, Heart, Minus, ArrowDown
      })
    )
  ]
};
