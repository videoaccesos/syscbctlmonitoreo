<?php
////Estilos de celdas
 class estilo_hoja1 {
	 var $alingHC = PHPExcel_Style_Alignment::HORIZONTAL_CENTER;
	 var $alingHR =  PHPExcel_Style_Alignment::HORIZONTAL_RIGHT;
	 var $alingHL = PHPExcel_Style_Alignment::HORIZONTAL_LEFT;
	 var $alingVT = PHPExcel_Style_Alignment::VERTICAL_TOP;
	 var $alingVC = PHPExcel_Style_Alignment::VERTICAL_CENTER; 
	
	 var $Encabezado = array(
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_LEFT,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ), 	 
	);
	
	 var $Encabezado2 = array(
	    'font'    => array(
	 		'size'      => '20',
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_LEFT,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ), 	 
	);
	
	 var $EncabezadoMes = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN
			),
		),
		
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_CENTER,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ), 
	);

	 var $Encabezado90 = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN
			),
		),
		
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_CENTER,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_BOTTOM
	    ), 
	);
	
	var $Concepto = array( 
	    'fill' 	=> array(
									'type'		=> PHPExcel_Style_Fill::FILL_SOLID,
									'color'		=> array('rgb' => 'f9FC6D')
		),
			 
	);
	
	var $Row = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => false,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_RIGHT,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),		 
	);

	var $RowText = array(
		'borders' => array(
			'allborders' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => false,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),		 
	);

	var $RowText2 = array(
		'borders' => array(
			'allborders' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => false,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	    )
	);
	
	var $RowFondo = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => false,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'size' => '28px',
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_WHITE
	            )
	           
	    ),
	     
	    'fill' 	=> array(
									'type'		=> PHPExcel_Style_Fill::FILL_SOLID,
									'color'		=> array('rgb' => '004269')
		),
		
		'alignment' => array(
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),		 
	);
	
	var $Medio = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_MEDIUM,
				'color' => array('argb' => 'FF000000'),
			),
		),
	);			
	
	var $Thin = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
	);
}

class estilo_hoja2 {
	 var $alingHC = PHPExcel_Style_Alignment::HORIZONTAL_CENTER;
	 var $alingHR =  PHPExcel_Style_Alignment::HORIZONTAL_RIGHT;
	 var $alingHL = PHPExcel_Style_Alignment::HORIZONTAL_LEFT;
	 var $alingVT = PHPExcel_Style_Alignment::VERTICAL_TOP;
	 var $alingVC = PHPExcel_Style_Alignment::VERTICAL_CENTER; 
	
	 var $Encabezado = array(
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_LEFT,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ), 	 
	);
	
	 var $Encabezado2 = array(
	    'font'    => array(
	 		'size'      => '20',
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_LEFT,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ), 	 
	);
	
	 var $EncabezadoMes = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN
			),
		),
		
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_CENTER,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ), 
	);
	
	var $Concepto = array( 
	    'fill' 	=> array(
									'type'		=> PHPExcel_Style_Fill::FILL_SOLID,
									'color'		=> array('rgb' => 'f9FC6D')
		),
			 
	);
	
	var $Row = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => false,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_RIGHT,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),		 
	);
	
	var $RowNegrita = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_RIGHT,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),		 
	);
	
	var $RowFondo = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => false,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	     
	    'fill' 	=> array(
									'type'		=> PHPExcel_Style_Fill::FILL_SOLID,
									'color'		=> array('rgb' => '4AE01F')
		),
		
		'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_RIGHT,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),		 
	);
	
	var $Medio = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_MEDIUM,
				'color' => array('argb' => 'FF000000'),
			),
		),
	);			
	
	var $Thin = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
	);
}




class estilo_hoja3 {
	 var $alingHC = PHPExcel_Style_Alignment::HORIZONTAL_CENTER;
	 var $alingHR =  PHPExcel_Style_Alignment::HORIZONTAL_RIGHT;
	 var $alingHL = PHPExcel_Style_Alignment::HORIZONTAL_LEFT;
	 var $alingVT = PHPExcel_Style_Alignment::VERTICAL_TOP;
	 var $alingVC = PHPExcel_Style_Alignment::VERTICAL_CENTER; 
	 
	 var $Titulo = array(
	    'font'    => array(
	 		'size'      => '16',
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_WHITE
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_CENTER,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),
	    
	    'fill' 	=> array(
									'type'		=> PHPExcel_Style_Fill::FILL_SOLID,
									'color'		=> array('rgb' => '000000')
		), 	 
	);
	
	var $SubTitulo = array(
	    'font'    => array(
	        'size'      => '12',
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_LEFT,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),
	    
	    'fill' 	=> array(
									'type'		=> PHPExcel_Style_Fill::FILL_SOLID,
									'color'		=> array('rgb' => 'CCCCCC')
		), 	 
	);

	var $SubTituloC = array(
	    'font'    => array(
	        'size'      => '12',
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_CENTER,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),
	    
	    'fill' 	=> array(
									'type'		=> PHPExcel_Style_Fill::FILL_SOLID,
									'color'		=> array('rgb' => 'CCCCCC')
		), 	 
	);
	
	var $EncabezadoMes= array(
	    'font'    => array(
	 		'size'      => '12',
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_WHITE
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_CENTER,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),
	    
	    'fill' 	=> array(
									'type'		=> PHPExcel_Style_Fill::FILL_SOLID,
									'color'		=> array('rgb' => '000000')
		), 	 
	);

	var $Encabezado = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	 		'size'      => '11',
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_WHITE
	        )
	    ),
	    
	    'alignment' => array(
            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_LEFT,
            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),
	    
	    'fill' 	=> array(
			'type'		=> PHPExcel_Style_Fill::FILL_SOLID,
			'color'		=> array('rgb' => 'AA0000')
		), 	 
	);
	
	var $SubEncabezado = array(
		'borders' => array(
			'allborders' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	 		'size'      => '10',
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	         )
	    ),
	    
	    'alignment' => array(
            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_LEFT,
            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),	 
	);
	
	var $SubEncabezadoR = array(
		'borders' => array(
			'allborders' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	 		'size'      => '10',
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	         )
	    ),
	  
	    'alignment' => array(
            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_RIGHT,
            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),	 
	);
	
	var $SubEncabezadoTotal = array(
		'borders' => array(
			'allborders' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	 		'size'      => '10',
	        'name'      => 'Arial',
	        'bold'      => true,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	         )
	    ),
	    
	    'alignment' => array(
            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_LEFT,
            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),

	    'fill' 	=> array(
			'type'		=> PHPExcel_Style_Fill::FILL_SOLID,
			'color'		=> array('rgb' => 'f9FC6D')
		),
	);
	
	var $Row = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => false,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_RIGHT,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),		 
	);
	
	var $RowR = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => false,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_RED
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_RIGHT,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),		 
	);
	
	var $RowFondo = array(
		'borders' => array(
			'outline' => array(
				'style' => PHPExcel_Style_Border::BORDER_THIN,
				'color' => array('argb' => 'FF000000'),
			),
		),
		
	    'font'    => array(
	        'name'      => 'Arial',
	        'bold'      => false,
	        'italic'    => false,
	        'underline' => PHPExcel_Style_Font::UNDERLINE_NONE,
	        'strike'    => false,
	        'color'     => array(
	        	'argb' => PHPExcel_Style_Color::COLOR_BLACK
	            )
	           
	    ),
	    
	    'alignment' => array(
	            'horizontal' => PHPExcel_Style_Alignment::HORIZONTAL_RIGHT,
	            'vertical' => PHPExcel_Style_Alignment::VERTICAL_CENTER
	    ),	

	    'fill' 	=> array(
			'type'		=> PHPExcel_Style_Fill::FILL_SOLID,
			'color'		=> array('rgb' => 'f9FC6D')
		),
	);
}
?>